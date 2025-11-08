import { PlanBuilder } from '..';
import type { MediaFile, OrganizeOptions } from '@/types/media';

const defaultOptions: OrganizeOptions = {
  pattern: '{YYYY}/{MM}',
  detectDuplicates: true,
  enableNearDuplicate: true,
  duplicateAction: 'copy-to-duplicates',
  actionForUnique: 'copy',
  layout: 'kind-then-date',
};

const createMockMediaFile = (id: string, srcPath: string, sha256: string, pHash?: string): MediaFile => ({
  ref: { id, srcPath, name: srcPath.split('/').pop() || '', size: 100, lastModified: Date.now(), ref: {} as any },
  meta: { kind: 'photo', detectedDate: { date: '2023-01-01T12:00:00Z', source: 'fs', confidence: 1 }, year: 2023, month: 1, extension: 'jpg' },
  hashes: { sha256, pHash },
});

describe('PlanBuilder', () => {
  it('should identify an exact duplicate', () => {
    const options = { ...defaultOptions };
    const planBuilder = new PlanBuilder(options);

    const file1 = createMockMediaFile('id1', 'source/a.jpg', 'hash1');
    const file2 = createMockMediaFile('id2', 'source/b.jpg', 'hash1');

    planBuilder.addFile(file1);
    planBuilder.addFile(file2);

    const plan = planBuilder.getPlan();

    expect(plan.items.length).toBe(2);
    expect(plan.items.find(i => i.file.ref.id === 'id1')?.reason).toBe('unique');
    expect(plan.items.find(i => i.file.ref.id === 'id2')?.reason).toBe('duplicate-exact');
    expect(plan.summary.totals.exactDup).toBe(1);
    expect(plan.summary.totals.nearDup).toBe(0);
  });

  it('should skip an exact duplicate when option is set', () => {
    const options = { ...defaultOptions, duplicateAction: 'skip' as const };
    const planBuilder = new PlanBuilder(options);

    const file1 = createMockMediaFile('id1', 'source/a.jpg', 'hash1');
    const file2 = createMockMediaFile('id2', 'source/b.jpg', 'hash1');

    planBuilder.addFile(file1);
    planBuilder.addFile(file2);

    const plan = planBuilder.getPlan();

    expect(plan.items.length).toBe(1);
    expect(plan.items[0].file.ref.id).toBe('id1');
    expect(plan.summary.totals.exactDup).toBe(1);
  });

  it('should identify a near duplicate', () => {
    const options = { ...defaultOptions };
    const planBuilder = new PlanBuilder(options);

    // pHashes with hamming distance of 8
    const file1 = createMockMediaFile('id1', 'source/a.jpg', 'hash1', '1234567890abcdef');
    const file2 = createMockMediaFile('id2', 'source/b.jpg', 'hash2', '1234567890abbdef');

    planBuilder.addFile(file1);
    planBuilder.addFile(file2);

    const plan = planBuilder.getPlan();

    expect(plan.items.length).toBe(2);
    expect(plan.items.find(i => i.file.ref.id === 'id1')?.reason).toBe('unique');
    expect(plan.items.find(i => i.file.ref.id === 'id2')?.reason).toBe('duplicate-near');
    expect(plan.summary.totals.exactDup).toBe(0);
    expect(plan.summary.totals.nearDup).toBe(1);
  });

  it('should not mark exact duplicates as near duplicates', () => {
    const options = { ...defaultOptions };
    const planBuilder = new PlanBuilder(options);

    // Same sha256, similar pHash
    const file1 = createMockMediaFile('id1', 'source/a.jpg', 'hash1', '1234567890abcdef');
    const file2 = createMockMediaFile('id2', 'source/b.jpg', 'hash1', '1234567890abbdef');

    planBuilder.addFile(file1);
    planBuilder.addFile(file2);

    const plan = planBuilder.getPlan();

    expect(plan.items.length).toBe(2);
    expect(plan.items.find(i => i.file.ref.id === 'id1')?.reason).toBe('unique');
    expect(plan.items.find(i => i.file.ref.id === 'id2')?.reason).toBe('duplicate-exact');
    expect(plan.summary.totals.exactDup).toBe(1);
    expect(plan.summary.totals.nearDup).toBe(0);
  });

  it('should resolve filename collisions', () => {
    const options = { ...defaultOptions, pattern: '{YYYY}' }; // Force collision
    const planBuilder = new PlanBuilder(options);

    const file1 = createMockMediaFile('id1', 'source/a.jpg', 'hash1');
    const file2 = createMockMediaFile('id2', 'source/b.jpg', 'hash2');

    // Both will want to go to 'photo/2023/a.jpg' initially if buildDestPath was naive,
    // but buildDestPath uses the name. Let's make names collide.
    const file1Colliding = { ...file1, ref: { ...file1.ref, name: 'same.jpg' } };
    const file2Colliding = { ...file2, ref: { ...file2.ref, name: 'same.jpg' } };

    planBuilder.addFile(file1Colliding);
    planBuilder.addFile(file2Colliding);

    const plan = planBuilder.getPlan();
    
    const path1 = plan.items.find(i => i.file.ref.id === 'id1')?.destRelPath;
    const path2 = plan.items.find(i => i.file.ref.id === 'id2')?.destRelPath;

    expect(path1).toBe('photo/2023/same.jpg');
    expect(path2).toBe('photo/2023/same_1.jpg');
  });

  it('should resolve filename collisions for files without extensions', () => {
    const options = { ...defaultOptions, pattern: '{YYYY}' };
    const planBuilder = new PlanBuilder(options);

    const file1 = createMockMediaFile('id1', 'source/a', 'hash1');
    const file2 = createMockMediaFile('id2', 'source/b', 'hash2');

    const file1Colliding = { ...file1, ref: { ...file1.ref, name: 'same' }, meta: { ...file1.meta, extension: '' } };
    const file2Colliding = { ...file2, ref: { ...file2.ref, name: 'same' }, meta: { ...file2.meta, extension: '' } };

    planBuilder.addFile(file1Colliding);
    planBuilder.addFile(file2Colliding);

    const plan = planBuilder.getPlan();
    
    const path1 = plan.items.find(i => i.file.ref.id === 'id1')?.destRelPath;
    const path2 = plan.items.find(i => i.file.ref.id === 'id2')?.destRelPath;

    expect(path1).toBe('photo/2023/same');
    expect(path2).toBe('photo/2023/same_1');
  });

  it('should handle chained near-duplicates', () => {
    const options = { ...defaultOptions };
    const planBuilder = new PlanBuilder(options);

    // A, B, and C are all different files (different sha256)
    // pHash similarity: A-B is close, B-C is close, but A-C is not.
    const pHashA = '11111111'; // 8 bits for simplicity
    const pHashB = '11111110'; // distance from A = 1
    const pHashC = '11111100'; // distance from B = 1, distance from A = 2
    const pHashD = '00111100'; // distance from C = 2, distance from B = 3, distance from A = 4

    const fileA = createMockMediaFile('idA', 'source/a.jpg', 'hashA', pHashA);
    const fileB = createMockMediaFile('idB', 'source/b.jpg', 'hashB', pHashB);
    const fileC = createMockMediaFile('idC', 'source/c.jpg', 'hashC', pHashC);
    const fileD = createMockMediaFile('idD', 'source/d.jpg', 'hashD', pHashD);

    planBuilder.addFile(fileA);
    planBuilder.addFile(fileB);
    planBuilder.addFile(fileC);
    planBuilder.addFile(fileD);

    const plan = planBuilder.getPlan();
    
    expect(plan.items.length).toBe(4);
    expect(plan.summary.totals.nearDup).toBe(3);
    expect(plan.items.find(i => i.file.ref.id === 'idA')?.reason).toBe('unique');
    expect(plan.items.find(i => i.file.ref.id === 'idB')?.reason).toBe('duplicate-near');
    expect(plan.items.find(i => i.file.ref.id === 'idC')?.reason).toBe('duplicate-near');
    expect(plan.items.find(i => i.file.ref.id === 'idD')?.reason).toBe('duplicate-near');
  });
});
