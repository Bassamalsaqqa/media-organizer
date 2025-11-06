import type { MediaFile, MediaMeta, OrganizeOptions, OrganizationPlan, PlanItem, PlanSummary } from '@/types/media';

import { buildDestPath } from './paths';

function resolveCollision(existing: Set<string>, desired: string): string {
  let finalPath = desired;
  let i = 1;
  while (existing.has(finalPath)) {
    const parts = desired.split('.');
    const ext = parts.pop();
    finalPath = `${parts.join('.')}_${i}.${ext}`;
    i++;
  }
  return finalPath;
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      dist++;
    }
  }
  return dist;
}

export class PlanBuilder {
  private summary: PlanSummary = { totals: { files: 0, photos: 0, videos: 0, exactDup: 0, nearDup: 0 } };
  private items: PlanItem[] = [];
  private destinationPaths = new Set<string>();
  private filesByHash = new Map<string, MediaFile[]>();
  private filesByPHash = new Map<string, MediaFile[]>();
  private options: OrganizeOptions;

  constructor(options: OrganizeOptions) {
    this.options = options;
  }

  public addFile(file: MediaFile) {
    this.summary.totals.files++;
    if (file.meta.kind === 'photo') this.summary.totals.photos++;
    if (file.meta.kind === 'video') this.summary.totals.videos++;

    if (this.options.detectDuplicates && file.hashes.sha256) {
      if (!this.filesByHash.has(file.hashes.sha256)) {
        this.filesByHash.set(file.hashes.sha256, []);
      }
      this.filesByHash.get(file.hashes.sha256)!.push(file);
    }

    if (this.options.enableNearDuplicate && file.meta.kind === 'photo' && file.hashes.pHash) {
      let foundNearDup = false;
      for (const [pHash, files] of this.filesByPHash.entries()) {
        if (hammingDistance(file.hashes.pHash, pHash) <= 9) {
          files.push(file);
          foundNearDup = true;
          break;
        }
      }
      if (!foundNearDup) {
        this.filesByPHash.set(file.hashes.pHash, [file]);
      }
    }

    const isExactDup = file.hashes.sha256 ? this.filesByHash.get(file.hashes.sha256)!.length > 1 : false;
    const isNearDup = file.hashes.pHash ? (this.filesByPHash.get(file.hashes.pHash) || []).length > 1 : false;

    if (isExactDup && this.options.duplicateAction === 'skip') {
      this.summary.totals.exactDup++;
      return;
    }

    const isDup = isExactDup || isNearDup;
    const reason = isExactDup ? 'duplicate-exact' : isNearDup ? 'duplicate-near' : 'unique';

    const dest = buildDestPath(file, this.options, isDup);
    const finalPath = resolveCollision(this.destinationPaths, dest);
    this.destinationPaths.add(finalPath);

    let action = this.options.actionForUnique;
    if (isDup && this.options.duplicateAction === 'copy-to-duplicates') {
      action = 'copy';
    }

    this.items.push({
      file,
      reason,
      destRelPath: finalPath,
      action: action,
      status: 'pending',
      meta: { policy: 'copy-only' },
    });
  }
      
  public updateFile(file: MediaFile) {
    const index = this.items.findIndex(item => item.file.ref.id === file.ref.id);
    if (index === -1) return;

    // This is a simplified update. A more robust implementation would
    // re-evaluate the entire plan based on the new data.
    this.items[index].file = file;
    this.items[index].error = undefined;
    this.items[index].status = 'pending';
  }

  public getPlan(): OrganizationPlan {
          // Post-process to mark first of duplicates as unique
          const finalItems: PlanItem[] = [];
          const processedIds = new Set<string>();
      
          for (const item of this.items) {
            if (processedIds.has(item.file.ref.id)) continue;
      
            if (item.reason === 'duplicate-exact' && item.file.hashes.sha256) {
              const group = this.filesByHash.get(item.file.hashes.sha256)!;
              const firstFile = group[0];
      
              if (item.file.ref.id === firstFile.ref.id) {
                // This is the first file in the duplicate set, mark as unique
                finalItems.push({ ...item, reason: 'unique' });
              } else {
                finalItems.push(item);
                this.summary.totals.exactDup++;
              }
            } else {
              finalItems.push(item);
            }
            processedIds.add(item.file.ref.id);
          }
      
          return { options: this.options, items: finalItems, summary: this.summary };
        }
      }
