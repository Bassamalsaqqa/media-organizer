import fs from 'fs/promises';
import path from 'path';
import pc from 'picocolors';

export interface Logger {
  info(message: string): void;
  error(message: string): void;
  log(message: string): void;
  jsonl(data: any, logFile: string): Promise<void>;
}

let silent = false;

function info(message: string) {
  if (silent) return;
  console.log(pc.blue(message));
}

function error(message: string) {
  if (silent) return;
  console.error(pc.red(message));
}

function log(message: string) {
  if (silent) return;
  console.log(message);
}

async function jsonl(data: any, logFile: string) {
  await fs.appendFile(logFile, JSON.stringify(data) + '\n');
}

export function createLogger(isSilent = false): Logger {
  silent = isSilent;
  return {
    info,
    error,
    log,
    jsonl,
  };
}
