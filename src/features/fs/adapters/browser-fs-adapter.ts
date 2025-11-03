import { IFsClient } from '..';

// Placeholder implementation of the File System Access API adapter.
// This is a client-side only implementation.
export class BrowserFsClient implements IFsClient {
  async pickDirectory(options: { mode: 'read' | 'readwrite' } = { mode: 'read' }): Promise<FileSystemDirectoryHandle | null> {
    try {
      return await window.showDirectoryPicker(options);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return null;
      }
      console.error('Error picking directory:', e);
      return null;
    }
  }

  async *walkRecursive(
    directoryHandle: FileSystemDirectoryHandle
  ): AsyncGenerator<FileSystemFileHandle, void, void> {
    for await (const entry of directoryHandle.values()) {
      if (entry.kind === 'file') {
        yield entry;
      } else if (entry.kind === 'directory') {
        yield* this.walkRecursive(entry);
      }
    }
  }

  async readChunk(
    fileHandle: FileSystemFileHandle,
    { start, size }: { start: number; size: number }
  ): Promise<ArrayBuffer> {
    const file = await fileHandle.getFile();
    const slice = file.slice(start, start + size);
    return slice.arrayBuffer();
  }

  async ensureDir(
    base: FileSystemDirectoryHandle,
    path: string
  ): Promise<FileSystemDirectoryHandle> {
    let current = base;
    const parts = path.split('/').filter(p => p.length > 0);
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
    return current;
  }

  async copy(
    sourceHandle: FileSystemFileHandle,
    targetDirHandle: FileSystemDirectoryHandle,
    newName?: string
  ): Promise<void> {
    const newFileHandle = await targetDirHandle.getFileHandle(newName || sourceHandle.name, { create: true });
    const writable = await newFileHandle.createWritable();
    const file = await sourceHandle.getFile();
    await writable.write(file);
    await writable.close();
  }

  async move(
    sourceHandle: FileSystemFileHandle,
    sourceDirHandle: FileSystemDirectoryHandle,
    targetDirHandle: FileSystemDirectoryHandle,
    newName?: string
  ): Promise<void> {
    // This is a simplified move. A proper implementation might need to handle cases across different volumes.
    await this.copy(sourceHandle, targetDirHandle, newName);
    await sourceDirHandle.removeEntry(sourceHandle.name);
  }
}

// Singleton instance for client-side usage
let fsClient: IFsClient | null = null;
export const getFsClient = (): IFsClient => {
    if (typeof window === 'undefined') {
        // Return a mock/dummy implementation for SSR if needed
        return {
            pickDirectory: async () => null,
            walkRecursive: async function* () {},
            readChunk: async () => new ArrayBuffer(0),
            ensureDir: async (base) => base,
            copy: async () => {},
            move: async () => {},
        };
    }
    if (!fsClient) {
        fsClient = new BrowserFsClient();
    }
    return fsClient;
};
