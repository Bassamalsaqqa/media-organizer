import { createFsClient, IFsClient } from '@/features/fs';
import { PlanBuilder } from '@/features/plan';
import { isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import type { MediaFile, MediaFileRef, OrganizeOptions, OrganizationPlan, PlanItem } from '@/types/media';
import { createMediaApi, IMediaApi } from '@/features/media';
import { detectMediaKind, getExtension } from '@/features/media/kind';

export type PlanProgress = {
  phase: 'index-destination' | 'scan-source';
  processed: number;
};

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
    destHandle: FileSystemDirectoryHandle | null,
    onProgress: (progress: PlanProgress) => void,
  ): Promise<OrganizationPlan> {
    if (destHandle && this.options.detectDuplicates) {
      await this.indexDestination(destHandle, onProgress);
    }

    let processed = 0;
    for await (const fileRef of this.fs.walkRecursive(sourceHandle)) {
      if (isSafeError(fileRef)) {
        continue;
      }

      const mediaFile = await this.processFile(fileRef);
      this.planBuilder.addFile(mediaFile);
      processed++;
      if (processed % 10 === 0) { // Update progress every 10 files
        onProgress({ phase: 'scan-source', processed });
      }
    }
    
    onProgress({ phase: 'scan-source', processed }); // Final progress update
    return this.planBuilder.getPlan();
  }

  private async indexDestination(
    destHandle: FileSystemDirectoryHandle,
    onProgress: (progress: PlanProgress) => void,
  ) {
    let processed = 0;

    for await (const fileRef of this.fs.walkRecursive(destHandle)) {
      if (isSafeError(fileRef) || fileRef.error) {
        continue;
      }

      const sha256 = await this.mediaApi.hashSha256(fileRef);
      if (!isSafeError(sha256)) {
        this.planBuilder.addExistingDestinationHash(sha256);
      }

      processed++;
      if (processed % 10 === 0) {
        onProgress({ phase: 'index-destination', processed });
      }
    }

    onProgress({ phase: 'index-destination', processed });
  }

  public async processFile(fileRef: MediaFileRef): Promise<MediaFile> {
    if (fileRef.error) {
      const fallbackDate = new Date(fileRef.lastModified);
      return {
        ref: fileRef,
        meta: {
          kind: detectMediaKind(fileRef.name),
          detectedDate: { date: fallbackDate.toISOString(), source: 'fs', confidence: 1 },
          year: fallbackDate.getUTCFullYear(),
          month: fallbackDate.getUTCMonth() + 1,
          extension: getExtension(fileRef.name),
        },
        hashes: {},
        error: fileRef.error,
      };
    }

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
          extension: getExtension(fileRef.name),
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
