export interface IFsClient {
  pickDirectory(options?: {
    mode: 'read' | 'readwrite';
  }): Promise<FileSystemDirectoryHandle | null>;
  walkRecursive(
    directoryHandle: FileSystemDirectoryHandle
  ): AsyncGenerator<FileSystemFileHandle, void, void>;
  readChunk(
    fileHandle: FileSystemFileHandle,
    options: { start: number; size: number }
  ): Promise<ArrayBuffer>;
  ensureDir(
    base: FileSystemDirectoryHandle,
    path: string
  ): Promise<FileSystemDirectoryHandle>;
  copy(
    sourceHandle: FileSystemFileHandle,
    targetDirHandle: FileSystemDirectoryHandle,
    newName?: string
  ): Promise<void>;
  move(
    sourceHandle: FileSystemFileHandle,
    sourceDirHandle: FileSystemDirectoryHandle,
    targetDirHandle: FileSystemDirectoryHandle,
    newName?: string
  ): Promise<void>;
}
