import { createFsClient, IFsClient } from '@/features/fs';
import { detectBestDate } from '@/features/metadata';
import { PlanBuilder } from '@/features/plan';
import { isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import type { MediaFile, MediaFileRef, OrganizeOptions, OrganizationPlan, PlanItem, MediaKind } from '@/types/media';
import { createMediaApi, IMediaApi } from '@/features/media';

export class Planner {
  private fs: IFsClient;
  private mediaApi: IMediaApi;
  private options: OrganizeOptions;
  private planBuilder: PlanBuilder;

  constructor(options: OrganizeOptions) {
    this.fs = createFsClient();
    this.mediaApi = createMediaApi();
    this.options = options;
    this.planBuilder = new PlanBuilder(options);
  }

  public async generatePlan(sourceHandle: FileSystemDirectoryHandle): Promise<OrganizationPlan> {
    for await (const fileRef of this.fs.walkRecursive(sourceHandle)) {
      if (isSafeError(fileRef)) {
        // This error is already logged in the fs adapter
        // Here we can decide to add it to the plan as a special item
        continue;
      }

      const mediaFile = await this.processFile(fileRef);
      this.planBuilder.addFile(mediaFile);
    }
    return this.planBuilder.getPlan();
  }

  public async processFile(fileRef: MediaFileRef): Promise<MediaFile> {
    const handle = fileRef.ref as FileSystemFileHandle;
    const file = await handle.getFile();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const kind: MediaKind = /jpe?g|png|gif|webp/.test(ext) ? 'photo' : /mov|mp4|mkv|avi/.test(ext) ? 'video' : 'unknown';

    const detectedDate = await detectBestDate(file, kind, file.name);
    const date = new Date(detectedDate.date);

    const meta = {
      kind,
      detectedDate,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      extension: ext,
    };

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
