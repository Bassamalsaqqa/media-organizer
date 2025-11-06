import { createFsClient, IFsClient } from '@/features/fs';
import type { OrganizationPlan, OrganizeOptions, PlanItem, SafeError } from '@/types/media';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '@/features/resume/indexeddb';
import { isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import { READ_ONLY } from '@/constants/policy';

export type ExecuteState = 'idle' | 'running' | 'paused' | 'finished';

export type Progress = {
  current: number;
  total: number;
  bytesCopied: number;
  errors: SafeError[];
};

type ProgressCallback = (progress: Progress) => void;

export class Executor {
  private state: ExecuteState = 'idle';
  private fs: IFsClient;
  private plan: OrganizationPlan;
  private sourceDir: FileSystemDirectoryHandle;
  private destDir: FileSystemDirectoryHandle;
  private onProgress: ProgressCallback;
  private abortController: AbortController = new AbortController();
  private completedIds: Set<string> = new Set();
  private bytesCopied = 0;
  private errors: SafeError[] = [];

  constructor(
    plan: OrganizationPlan,
    sourceDir: FileSystemDirectoryHandle,
    destDir: FileSystemDirectoryHandle,
    onProgress: ProgressCallback,
  ) {
    this.fs = createFsClient();
    this.plan = plan;
    this.sourceDir = sourceDir;
    this.destDir = destDir;
    this.onProgress = onProgress;
  }

  public async start() {
    if (this.state !== 'idle') return;
    this.state = 'running';
    this.run();
  }

  public pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.abortController.abort();
    this.saveCheckpoint();
  }

  public async resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.abortController = new AbortController();
    const checkpoint = await loadCheckpoint(this.plan.summary.totals.files.toString()); // Assumes planId is total files
    if (checkpoint) {
      this.completedIds = new Set(checkpoint.completedIds);
      this.bytesCopied = checkpoint.bytesCopied;
    }
    this.run();
  }

  private async run() {
    const queue = this.plan.items.filter(item => !this.completedIds.has(item.file.ref.id));

    for (const item of queue) {
      if (this.state !== 'running') break;

      if (READ_ONLY && item.action !== 'copy') {
        const policyError: SafeError = {
          code: 'POLICY',
          message: 'Copy-only policy enforced. Cannot perform non-copy operations.',
          file: item.file.ref.srcPath,
        };
        this.errors.push(policyError);
        logger.error(policyError);
        continue;
      }

      const result = await this.fs.copy(item.file.ref, this.destDir, item.destRelPath);

      if (isSafeError(result)) {
        this.errors.push(result);
        logger.error(result);
      } else {
        this.completedIds.add(item.file.ref.id);
        this.bytesCopied += item.file.ref.size;
      }

      this.onProgress({
        current: this.completedIds.size,
        total: this.plan.items.length,
        bytesCopied: this.bytesCopied,
        errors: this.errors,
      });

      if (this.completedIds.size % 25 === 0) {
        this.saveCheckpoint();
      }
    }

    if (this.state === 'running') {
      this.state = 'finished';
      this.clearCheckpoint();
    }
  }

  private saveCheckpoint() {
    saveCheckpoint({
      planId: this.plan.summary.totals.files.toString(),
      completedIds: Array.from(this.completedIds),
      bytesCopied: this.bytesCopied,
      startedAt: Date.now(), // This should be set at the real start
      lastUpdated: Date.now(),
      version: 1,
    });
  }

  private clearCheckpoint() {
    clearCheckpoint(this.plan.summary.totals.files.toString());
  }
}
