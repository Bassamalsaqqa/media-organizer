import { safeWrap } from '@/lib/errors';
import type { MediaFileRef, MediaMeta, SafeError } from '@/types/media';
import { createWorkerPool } from './workers/pool';

export interface IMediaApi {
  getMetadata(ref: MediaFileRef): Promise<MediaMeta | SafeError>;
  hashSha256(ref: MediaFileRef): Promise<string | SafeError>;
  pHashPhoto(ref: MediaFileRef): Promise<string | SafeError>;
  destroy(): void;
}

export function createMediaApi(): IMediaApi {
  const hashPool = createWorkerPool<{ file: File; type: 'sha256' | 'pHash' }, { hash?: string; pHash?: string; error?: string }>(
    () => new Worker(new URL('./workers/worker-hash.ts', import.meta.url)),
    { numWorkers: 2 },
  );
  hashPool.start();

  const metaPool = createWorkerPool<{ file: File }, { meta?: MediaMeta; error?: string }>(
    () => new Worker(new URL('./workers/worker-meta.ts', import.meta.url)),
    { numWorkers: 2 },
  );
  metaPool.start();

  async function getMetadata(ref: MediaFileRef): Promise<MediaMeta | SafeError> {
    return safeWrap(
      'METADATA_WORKER',
      async () => {
        const handle = ref.ref as FileSystemFileHandle;
        const file = await handle.getFile();
        const result = await metaPool.addJob({ file });
        if (result.error || !result.meta) {
          throw new Error(result.error || 'Worker did not return metadata');
        }
        return result.meta;
      },
      { file: ref.srcPath },
    );
  }

  async function hashSha256(ref: MediaFileRef): Promise<string | SafeError> {
    return safeWrap(
      'HASH_WORKER',
      async () => {
        const handle = ref.ref as FileSystemFileHandle;
        const file = await handle.getFile();
        const result = await hashPool.addJob({ file, type: 'sha256' });
        if (result.error || !result.hash) {
          throw new Error(result.error || 'Worker did not return hash');
        }
        return result.hash;
      },
      { file: ref.srcPath },
    );
  }

  async function pHashPhoto(ref: MediaFileRef): Promise<string | SafeError> {
    return safeWrap(
      'PHASH_WORKER',
      async () => {
        const handle = ref.ref as FileSystemFileHandle;
        const file = await handle.getFile();
        const result = await hashPool.addJob({ file, type: 'pHash' });
        if (result.error || !result.pHash) {
          throw new Error(result.error || 'Worker did not return pHash');
        }
        return result.pHash;
      },
      { file: ref.srcPath },
    );
  }

  function destroy() {
    hashPool.stop();
    metaPool.stop();
  }

  return {
    getMetadata,
    hashSha256,
    pHashPhoto,
    destroy,
  };
}