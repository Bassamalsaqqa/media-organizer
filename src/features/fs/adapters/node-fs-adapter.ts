import type { IFsClient } from '..';
import type { MediaFileRef } from '@/types/media';
import * as fs from 'fs/promises';
import * as path from 'path';

async function pickDirectory(opts: { mode: 'read' | 'readwrite' }): Promise<any> {
  throw new Error('Not implemented for node');
}

async function* walkRecursive(
  root: any,
  p = '',
): AsyncGenerator<MediaFileRef, void, unknown> {
  const dir = root as string;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const newPath = path.join(p, entry.name);
    if (entry.isFile()) {
      const stat = await fs.stat(path.join(dir, entry.name));
      yield {
        id: newPath,
        name: entry.name,
        size: stat.size,
        lastModified: stat.mtimeMs,
        srcPath: newPath,
        ref: newPath,
      };
    } else if (entry.isDirectory()) {
      yield* walkRecursive(path.join(dir, entry.name), newPath);
    }
  }
}

async function readChunk(ref: MediaFileRef, start: number, end: number): Promise<ArrayBuffer> {
  const handle = ref.ref as string;
  const file = await fs.open(handle, 'r');
  const buffer = Buffer.alloc(end - start);
  await file.read(buffer, 0, end - start, start);
  await file.close();
  return buffer.buffer;
}

async function ensureDir(segments: string[], destRoot: any): Promise<any> {
    const dest = destRoot as string;
    let currentPath = dest;
    for (const segment of segments) {
        if (segment === '') continue;
        currentPath = path.join(currentPath, segment);
        try {
            await fs.mkdir(currentPath);
        } catch (e: any) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
        }
    }
    return currentPath;
}

async function copy(ref: MediaFileRef, destRoot: any, destRelPath: string): Promise<void> {
    const sourcePath = ref.ref as string;
    const destPath = path.join(destRoot as string, destRelPath);
    await fs.copyFile(sourcePath, destPath);
}

export const nodeFsAdapter: IFsClient = {
  pickDirectory,
  walkRecursive,
  readChunk,
  ensureDir,
  copy,
};