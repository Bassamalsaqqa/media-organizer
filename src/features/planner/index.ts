import { createFsClient, IFsClient } from '@/features/fs';
import { PlanBuilder } from '@/features/plan';
import { isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import type { MediaFile, MediaFileRef, OrganizeOptions, OrganizationPlan, PlanItem } from '@/types/media';
import { createMediaApi, IMediaApi } from '@/features/media';

export class Planner {
  private fs: IFsClient;
  public mediaApi: IMediaApi;
  private options: OrganizeOptions;
  private planBuilder: PlanBuilder;

  constructor(options: OrganizeOptions) {
    this.fs = createFsClient();
    this.mediaApi = createMediaApi();
    this.options = options;
    this.planBuilder = new PlanBuilder(options);
  }

  public async generatePlan(
    sourceHandle: FileSystemDirectoryHandle,
    onProgress: (progress: { processed: number }) => void,
  ): Promise<OrganizationPlan> {
    let processed = 0;
    for await (const fileRef of this.fs.walkRecursive(sourceHandle)) {
      if (isSafeError(fileRef)) {
        // This error is already logged in the fs adapter
        // Here we can decide to add it to the plan as a special item
        continue;
      }

      const mediaFile = await this.processFile(fileRef);
      this.planBuilder.addFile(mediaFile);
      processed++;
      if (processed % 10 === 0) { // Update progress every 10 files
        onProgress({ processed });
      }
    }
    
    onProgress({ processed }); // Final progress update
    return this.planBuilder.getPlan();
  }

  public async processFile(fileRef: MediaFileRef): Promise<MediaFile> {
    const meta = await this.mediaApi.getMetadata(fileRef);
    if (isSafeError(meta)) {
      logger.error(meta);
      // Create a minimal MediaFile object to represent the failure
      const fallbackDate = new Date(fileRef.lastModified);
      return {
        ref: fileRef,
        meta: {
          kind: 'unknown',
          detectedDate: { date: fallbackDate.toISOString(), source: 'fs', confidence: 1 },
          year: fallbackDate.getUTCFullYear(),
          month: fallbackDate.getUTCMonth() + 1,
          extension: fileRef.name.split('.').pop()?.toLowerCase() || '',
        },
        hashes: {},
        error: meta,
      };
    }

    const sha256 = await this.mediaApi.hashSha256(fileRef);
    if (isSafeError(sha256)) {
      logger.error(sha256);
      return { ref: fileRef, meta, hashes: {}, error: sha256 };
    }

    const pHash = this.options.enableNearDuplicate && meta.kind === 'photo' ? await this.mediaApi.pHashPhoto(fileRef) : undefined;
    if (isSafeError(pHash)) {
      logger.error(pHash);
      return { ref: fileRef, meta, hashes: { sha256 }, error: pHash };
    }

    return { ref: fileRef, meta, hashes: { sha256, pHash } };
  }

  public async reprocessFile(item: PlanItem): Promise<OrganizationPlan> {
    const handle = item.file.ref.ref as FileSystemFileHandle;
    await handle.requestPermission({ mode: 'read' });
    const mediaFile = await this.processFile(item.file.ref);
    this.planBuilder.updateFile(mediaFile);
    return this.planBuilder.getPlan();
  }
}
