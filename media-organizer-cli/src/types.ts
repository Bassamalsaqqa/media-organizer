export type ExecutionStatus = 'pending' | 'success' | 'failed' | 'already-present' | 'skipped' | 'conflict' | 'dry-run' | 'skipped-overwrite';

export interface PlanItem {
  action: 'copy' | 'move' | 'skip' | 'duplicate';
  source: string;
  destination: string;
  checksum?: string;
}

export interface Options {
  plan: string;
  execute: boolean;
  dryRun: boolean;
  concurrency: number;
  verify: boolean;
  resume: boolean;
  duplicatesDir: string;
  noOverwrite: boolean;
  sourceRoot?: string;
  destRoot?: string;
}

export interface LogData extends PlanItem {

  sourceHash?: string;

  status: ExecutionStatus;

  startTime: string;

  endTime?: string;

  destHash?: string;

  error?: string;

  fileSize?: number;

}
