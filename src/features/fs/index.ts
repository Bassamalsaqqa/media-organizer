import { browserFsAdapter } from './adapters/browser-fs-adapter';
import type { MediaFileRef, SafeError } from '@/types/media';

export interface IFsClient {
  pickDirectory(opts: { mode: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle | null>;
  walkRecursive(root: FileSystemDirectoryHandle): AsyncGenerator<MediaFileRef | SafeError, void, unknown>;
  readChunk(ref: MediaFileRef, start: number, end: number): Promise<ArrayBuffer>;
  ensureDir(segments: string[], destRoot: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle>;
  copy(ref: MediaFileRef, destRoot: FileSystemDirectoryHandle, destRelPath: string): Promise<void | SafeError>;
}

export function createFsClient(): IFsClient {
    if (typeof window === 'undefined') {
        const { nodeFsAdapter } = require('./adapters/node-fs-adapter');
        return nodeFsAdapter as any;
    } else {
        return browserFsAdapter;
    }
}
