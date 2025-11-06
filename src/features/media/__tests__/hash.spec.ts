import { createMediaApi } from '..';
import type { MediaFileRef } from '@/types/media';

// Mock FileSystemFileHandle
const createMockFile = (content: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  return {
    getFile: async () => blob,
  } as unknown as FileSystemFileHandle;
};

const createMockMediaFileRef = (name: string, content: string): MediaFileRef => ({
  id: '1',
  name,
  size: content.length,
  lastModified: Date.now(),
  srcPath: name,
  ref: createMockFile(content),
});

describe('hashSha256', () => {
  const mediaApi = createMediaApi();

  it('should correctly calculate SHA-256 hash of a small string', async () => {
    const content = 'hello world';
    const ref = createMockMediaFileRef('test.txt', content);
    const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

    const hash = await mediaApi.hashSha256(ref);
    expect(hash).toBe(expectedHash);
  });
});
