import { browserFsAdapter } from './adapters/browser-fs-adapter';
import type { MediaFileRef, SafeError } from '@/types/media';

export type CopyResult =
  | { status: 'copied'; bytesCopied: number }
  | { status: 'already-exists'; bytesCopied: 0 };

export type CopyOptions = {
  expectedSha256?: string;
  overwriteExisting?: boolean;
};

export interface IFsClient {
  pickDirectory(opts: { mode: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle | null>;
  walkRecursive(root: FileSystemDirectoryHandle): AsyncGenerator<MediaFileRef | SafeError, void, unknown>;
  readChunk(ref: MediaFileRef, start: number, end: number): Promise<ArrayBuffer>;
  ensureDir(segments: string[], destRoot: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle>;
  copy(
    ref: MediaFileRef,
    destRoot: FileSystemDirectoryHandle,
    destRelPath: string,
    options?: CopyOptions,
  ): Promise<CopyResult | SafeError>;
}

export function createFsClient(): IFsClient {
    if (typeof window === 'undefined') {
        const { nodeFsAdapter } = require('./adapters/node-fs-adapter');
        return nodeFsAdapter as any;
    } else {
        return browserFsAdapter;
    }
}
