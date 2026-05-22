import { createFsClient, IFsClient } from '@/features/fs';
import type { OrganizationPlan, PlanItem, SafeError } from '@/types/media';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '@/features/resume/indexeddb';
import { isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import { READ_ONLY } from '@/constants/policy';

export type ExecuteState = 'idle' | 'running' | 'paused' | 'finished' | 'finished-with-errors';

export type Progress = {
  current: number;
  total: number;
  bytesCopied: number;
  errors: SafeError[];
};

type ProgressCallback = (progress: Progress) => void;
type StateCallback = (state: ExecuteState) => void;

export class Executor {
  private state: ExecuteState = 'idle';
  private fs: IFsClient;
  private plan: OrganizationPlan;
  private planId: string;
  private sourceDir: FileSystemDirectoryHandle;
  private destDir: FileSystemDirectoryHandle;
  private onProgress: ProgressCallback;
  private onStateChange?: StateCallback;
  private abortController: AbortController = new AbortController();
  private completedIds: Set<string> = new Set();
  private failedIds: Set<string> = new Set();
  private bytesCopied = 0;
  private errors: SafeError[] = [];

  constructor(
    plan: OrganizationPlan,
    planId: string,
    sourceDir: FileSystemDirectoryHandle,
    destDir: FileSystemDirectoryHandle,
    onProgress: ProgressCallback,
    onStateChange?: StateCallback,
  ) {
    this.fs = createFsClient();
    this.plan = plan;
    this.planId = planId;
    this.sourceDir = sourceDir;
    this.destDir = destDir;
    this.onProgress = onProgress;
    this.onStateChange = onStateChange;
  }

  public getPlanId(): string {
    return this.planId;
  }

  public async start() {
    if (this.state !== 'idle') return;
    await this.restoreCheckpoint();
    this.failedIds.clear();
    this.errors = [];
    this.setState('running');
    this.run('remaining');
  }

  public pause() {
    if (this.state !== 'running') return;
    this.setState('paused');
    this.abortController.abort();
    this.saveCheckpoint();
  }

  public async resume() {
    if (this.state !== 'paused' && this.state !== 'idle') {
      return;
    }

    await this.restoreCheckpoint();

    this.setState('running');
    this.abortController = new AbortController();
    this.run('remaining');
  }

  public async retryFailed() {
    if (this.state === 'running') return;

    await this.restoreCheckpoint();
    this.errors = [];
    this.setState('running');
    this.abortController = new AbortController();
    this.run('failed');
  }

  private async run(mode: 'remaining' | 'failed') {
    const queue = this.getQueue(mode);

    for (const item of queue) {
      if (this.state !== 'running') break;

      if (item.status === 'skipped') {
        this.completedIds.add(item.file.ref.id);
        this.failedIds.delete(item.file.ref.id);
        await this.saveCheckpoint();
        this.emitProgress();
        continue;
      }

      if (item.status === 'error') {
        const itemError: SafeError = item.error ?? {
          code: 'UNKNOWN',
          message: 'File could not be planned for copying.',
          file: item.file.ref.srcPath,
        };
        this.errors.push(itemError);
        this.failedIds.add(item.file.ref.id);
        await this.saveCheckpoint();
        this.emitProgress();
        continue;
      }

      if (READ_ONLY && item.action !== 'copy') {
        const policyError: SafeError = {
          code: 'POLICY',
          message: 'Copy-only policy enforced. Cannot perform non-copy operations.',
          file: item.file.ref.srcPath,
        };
        this.errors.push(policyError);
        this.failedIds.add(item.file.ref.id);
        logger.error(policyError);
        await this.saveCheckpoint();
        continue;
      }

      const result = await this.fs.copy(item.file.ref, this.destDir, item.destRelPath, {
        expectedSha256: item.file.hashes.sha256,
        overwriteExisting: this.failedIds.has(item.file.ref.id),
      });

      if (isSafeError(result)) {
        this.errors.push(result);
        this.failedIds.add(item.file.ref.id);
        logger.error(result);
        await this.saveCheckpoint();
        if (this.isStorageDisconnected(result)) {
          this.setState('paused');
          this.emitProgress();
          return;
        }
      } else {
        this.completedIds.add(item.file.ref.id);
        this.failedIds.delete(item.file.ref.id);
        this.bytesCopied += result.bytesCopied;
        await this.saveCheckpoint();
      }

      this.emitProgress();
    }

    if (this.state === 'running') {
      if (this.failedIds.size > 0 || this.errors.length > 0) {
        this.setState('finished-with-errors');
        await this.saveCheckpoint();
      } else {
        this.setState('finished');
        this.clearCheckpoint();
      }
    }
  }

  private getQueue(mode: 'remaining' | 'failed'): PlanItem[] {
    if (mode === 'failed') {
      return this.plan.items.filter(item => this.failedIds.has(item.file.ref.id));
    }

    return this.plan.items.filter(item => !this.completedIds.has(item.file.ref.id));
  }

  private async restoreCheckpoint() {
    const checkpoint = await loadCheckpoint(this.planId);
    if (checkpoint) {
      this.completedIds = new Set(checkpoint.completedIds);
      this.failedIds = new Set(checkpoint.failedIds ?? []);
      this.bytesCopied = checkpoint.bytesCopied;
    }

    this.emitProgress();
  }

  private emitProgress() {
    this.onProgress({
      current: this.completedIds.size,
      total: this.plan.items.length,
      bytesCopied: this.bytesCopied,
      errors: this.errors,
    });
  }

  private isStorageDisconnected(error: SafeError): boolean {
    const text = `${error.message} ${error.cause ?? ''}`.toLowerCase();
    return (
      text.includes('notfound') ||
      text.includes('not found') ||
      text.includes('notreadable') ||
      text.includes('not readable') ||
      text.includes('permission') ||
      text.includes('device') ||
      text.includes('network') ||
      text.includes('disconnected')
    );
  }

  private setState(state: ExecuteState) {
    this.state = state;
    this.onStateChange?.(state);
  }

  private saveCheckpoint() {
    return saveCheckpoint({
      planId: this.planId,
      completedIds: Array.from(this.completedIds),
      failedIds: Array.from(this.failedIds),
      bytesCopied: this.bytesCopied,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      version: 1,
    });
  }

  private clearCheckpoint() {
    clearCheckpoint(this.planId);
  }
}
