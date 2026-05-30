import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import type { Stats } from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function copyFile(source: string, destination: string): Promise<void> {
  const destDir = path.dirname(destination);
  await ensureDir(destDir);
  const tempFile = destination + '.tmp';
  const sourceStats = await fs.stat(source);
  await fs.copyFile(source, tempFile);
  await preserveFileTimes(sourceStats, tempFile);
  await fs.rename(tempFile, destination);
  await preserveFileTimes(sourceStats, destination);
}

async function preserveFileTimes(sourceStats: Stats, destination: string): Promise<void> {
  await fs.utimes(destination, sourceStats.atime, sourceStats.mtime);

  if (process.platform === 'win32') {
    await setWindowsCreationTime(destination, sourceStats.birthtime);
  }
}

async function setWindowsCreationTime(destination: string, birthtime: Date): Promise<void> {
  const script = [
    '& { param($path, $ticks)',
    '$ticks = [int64]$ticks',
    '$date = [DateTimeOffset]::FromUnixTimeMilliseconds($ticks).UtcDateTime',
    '[System.IO.File]::SetCreationTimeUtc($path, $date)',
    '}',
  ].join('; ');

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script,
    destination,
    String(birthtime.getTime()),
  ]);
}


