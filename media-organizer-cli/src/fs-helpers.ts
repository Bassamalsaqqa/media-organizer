import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function copyFile(source: string, destination: string): Promise<void> {
  const destDir = path.dirname(destination);
  await ensureDir(destDir);
  const tempFile = destination + '.tmp';
  await fs.copyFile(source, tempFile);
  await fs.rename(tempFile, destination);
}


