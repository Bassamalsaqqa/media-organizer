import { safeWrap, isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import type { CopyOptions, CopyResult, IFsClient } from '..';
import type { MediaFileRef, SafeError } from '@/types/media';
import * as path from 'path-browserify';

function stableFileId(srcPath: string, size: number, lastModified: number): string {
  return `${srcPath}|${size}|${Math.round(lastModified)}`;
}

async function pickDirectory(opts: { mode: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker(opts);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return null;
    }
    throw e;
  }
}

async function* walkRecursive(
  root: FileSystemDirectoryHandle,
  path = '',
): AsyncGenerator<MediaFileRef | SafeError, void, unknown> {
  for await (const entry of root.values()) {
    const newPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const result = await safeWrap(
        'FS_READ',
        async () => {
          const file = await entry.getFile();
          return {
            id: stableFileId(newPath, file.size, file.lastModified),
            name: entry.name,
            size: file.size,
            lastModified: file.lastModified,
            srcPath: newPath,
            ref: entry,
          };
        },
        { file: newPath },
      );

      if (isSafeError(result)) {
        logger.error(result);
        yield {
          id: stableFileId(newPath, 0, 0),
          name: entry.name,
          size: 0,
          lastModified: 0,
          srcPath: newPath,
          ref: entry,
          error: result,
        };
      } else {
        yield result;
      }
    } else if (entry.kind === 'directory') {
      yield* walkRecursive(entry, newPath);
    }
  }
}

async function readChunk(ref: MediaFileRef, start: number, end: number): Promise<ArrayBuffer> {
  const handle = ref.ref as FileSystemFileHandle;
  const file = await handle.getFile();
  return file.slice(start, end).arrayBuffer();
}

async function ensureDir(segments: string[], destRoot: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  let currentHandle = destRoot;
  for (const segment of segments) {
    if (segment === '') continue;
    currentHandle = await currentHandle.getDirectoryHandle(segment, { create: true });
  }
  return currentHandle;
}

async function resolveFileNameCollision(desiredName: string, checkExists: (name: string) => Promise<boolean>): Promise<string> {
  let finalName = desiredName;
  let counter = 1;
  const { name, ext } = path.parse(desiredName);

  while (await checkExists(finalName)) {
    finalName = `${name}_(${counter})${ext}`;
    counter++;
  }
  return finalName;
}

async function copy(
  ref: MediaFileRef,
  destRoot: FileSystemDirectoryHandle,
  destRelPath: string,
  options: CopyOptions = {},
): Promise<CopyResult | SafeError> {
  return safeWrap(
    'COPY',
    async () => {
      const handle = ref.ref as FileSystemFileHandle;
      const file = await handle.getFile();

      const destPathParts = destRelPath.split('/');
      const fileName = destPathParts.pop()!;
      const dirSegments = destPathParts;

      const destDirHandle = await ensureDir(dirSegments, destRoot);
      const existing = await getExistingFile(destDirHandle, fileName);
      if (existing) {
        const existingFile = await existing.getFile();
        if (existingFile.size === file.size) {
          const expectedHash = options.expectedSha256 ?? await hashFile(file);
          const existingHash = await hashFile(existingFile);
          if (existingHash === expectedHash) {
            return { status: 'already-exists', bytesCopied: 0 };
          }
        }
        if (!options.overwriteExisting) {
          throw new Error(`Destination exists but does not match the planned file: ${destRelPath}`);
        }
      }

      const finalFileName = options.overwriteExisting
        ? fileName
        : await resolveFileNameCollision(fileName, async (nameToCheck) => {
            try {
              await destDirHandle.getFileHandle(nameToCheck, { create: false });
              return true;
            } catch (e: any) {
              if (e.name === 'NotFoundError') return false;
              throw e;
            }
          });

      const destFileHandle = await destDirHandle.getFileHandle(finalFileName, { create: true });
      const writable = await destFileHandle.createWritable({ keepExistingData: false });
      await writable.write(file);
      await writable.close();
      return { status: 'copied', bytesCopied: file.size };
    },
    { file: ref.srcPath },
  );
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getExistingFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await dirHandle.getFileHandle(fileName, { create: false });
  } catch (e: any) {
    if (e.name === 'NotFoundError') return null;
    throw e;
  }
}

export const browserFsAdapter: IFsClient = {
  pickDirectory,
  walkRecursive,
  readChunk,
  ensureDir,
  copy,
};
