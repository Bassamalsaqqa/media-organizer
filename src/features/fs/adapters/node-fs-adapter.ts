import type { CopyOptions, CopyResult, IFsClient } from '..';
import type { MediaFileRef } from '@/types/media';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

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
        id: `${newPath}|${stat.size}|${Math.round(stat.mtimeMs)}`,
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

async function copy(ref: MediaFileRef, destRoot: any, destRelPath: string, options: CopyOptions = {}): Promise<CopyResult> {
    const sourcePath = ref.ref as string;
    const destPath = path.join(destRoot as string, destRelPath);
    try {
      const [sourceStat, destStat] = await Promise.all([fs.stat(sourcePath), fs.stat(destPath)]);
      if (sourceStat.size === destStat.size) {
        const expectedHash = options.expectedSha256 ?? await hashFile(sourcePath);
        const existingHash = await hashFile(destPath);
        if (existingHash === expectedHash) {
          return { status: 'already-exists', bytesCopied: 0 };
        }
      }
      if (!options.overwriteExisting) {
        throw new Error(`Destination exists but does not match the planned file: ${destRelPath}`);
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(sourcePath, destPath);
    const stat = await fs.stat(sourcePath);
    return { status: 'copied', bytesCopied: stat.size };
}

async function hashFile(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

export const nodeFsAdapter: IFsClient = {
  pickDirectory,
  walkRecursive,
  readChunk,
  ensureDir,
  copy,
};
