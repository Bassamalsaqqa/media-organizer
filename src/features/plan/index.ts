import type { MediaFile, MediaMeta, OrganizeOptions, OrganizationPlan, PlanItem, PlanSummary } from '@/types/media';

import { buildDestPath } from './paths';

function resolveCollision(existing: Set<string>, desired: string): string {
  let finalPath = desired;
  let i = 1;
  while (existing.has(finalPath)) {
    const dotIndex = desired.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex === 0) {
      // No extension or a dotfile like .bashrc
      finalPath = `${desired}_${i}`;
    } else {
      const name = desired.substring(0, dotIndex);
      const ext = desired.substring(dotIndex); // Includes the dot
      finalPath = `${name}_${i}${ext}`;
    }
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

    let isExactDup = false;
    if (this.options.detectDuplicates && file.hashes.sha256) {
      const group = this.filesByHash.get(file.hashes.sha256);
      if (group) {
        isExactDup = true;
        this.summary.totals.exactDup++;
        group.push(file);
      } else {
        this.filesByHash.set(file.hashes.sha256, [file]);
      }
    }

    if (isExactDup && this.options.duplicateAction === 'skip') {
      return;
    }

    let isNearDup = false;
    if (this.options.enableNearDuplicate && file.meta.kind === 'photo' && file.hashes.pHash) {
      let group: MediaFile[] | undefined;

      // Iterate over a snapshot of the keys, as we might modify the map during iteration
      const existingHashes = [...this.filesByPHash.keys()];
      for (const pHash of existingHashes) {
        if (hammingDistance(file.hashes.pHash, pHash) <= 9) {
          group = this.filesByPHash.get(pHash)!;
          break;
        }
      }

      if (group) {
        // Found a similar group, add the new file to it.
        group.push(file);
        // Also, map the new file's own pHash to this existing group for future transitive checks.
        this.filesByPHash.set(file.hashes.pHash, group);
        if (!isExactDup) {
          isNearDup = true;
          this.summary.totals.nearDup++;
        }
      } else {
        // No similar group found, create a new one.
        this.filesByPHash.set(file.hashes.pHash, [file]);
      }
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
    // The `addFile` method now correctly calculates the summary and sets the
    // appropriate `reason` on each item. This method is now just a getter.
    return { options: this.options, items: this.items, summary: this.summary };
  }
      }
