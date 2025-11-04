import fs from 'fs/promises';
import path from 'path';
import { createLogger } from './logger';
import { hashFile } from './hash';
import { copyFile, ensureDir } from './fs-helpers';
import type { PlanItem, Options, LogData } from './types';

const logger = createLogger();

async function main() {
  const options = parseArgs();

  if (options.dryRun) {
    logger.info('Dry run mode. No files will be changed.');
  }

  const plan = await readPlan(options.plan);

  if (!plan) {
    logger.error('Could not read plan file.');
    process.exit(1);
  }

  await executePlan(plan, options);
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    plan: '',
    execute: false,
    dryRun: false,
    concurrency: 4,
    verify: false,
    resume: false,
    duplicatesDir: 'duplicates',
    noOverwrite: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--plan':
        options.plan = args[++i];
        break;
      case '--execute':
        options.execute = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--concurrency':
        options.concurrency = parseInt(args[++i], 10);
        break;
      case '--verify':
        options.verify = true;
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--duplicates-dir':
        options.duplicatesDir = args[++i];
        break;
      case '--no-overwrite':
        options.noOverwrite = true;
        break;
      case '--source-root':
        options.sourceRoot = args[++i];
        break;
      case '--dest-root':
        options.destRoot = args[++i];
        break;
    }
  }

  if (!options.plan) {
    logger.error('Usage: node dist/execute-plan.js --plan <plan.json> [--execute | --dry-run]');
    process.exit(1);
  }

  return options;
}

async function readPlan(planPath: string): Promise<PlanItem[] | null> {
  try {
    const data = await fs.readFile(planPath, 'utf-8');
    return JSON.parse(data).items;
  } catch (error) {
    logger.error(`Error reading plan file: ${error}`);
    return null;
  }
}

async function executePlan(plan: PlanItem[], options: Options) {
  logger.info('Starting execution with copy-only policy. Source files will not be deleted.');
  const concurrency = options.concurrency;
  const queue = [...plan];
  let completed = 0;
  let failed = 0;
  const errors: string[] = [];
  const startTime = process.hrtime.bigint();

  const stateFile = '.organizer-state.jsonl';
  const auditLogFile = 'organizer-execution.log';

  const completedHashes = new Set<string>();
  if (options.resume) {
    try {
      const stateData = await fs.readFile(stateFile, 'utf-8');
      const lines = stateData.split('\n');
      for (const line of lines) {
        if (line) {
          const state = JSON.parse(line);
          if (state.status === 'success') {
            completedHashes.add(state.sourceHash);
          }
        }
      }
    } catch (e) {
      // State file doesn't exist, which is fine
    }
  }

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;

      const sourcePath = path.isAbsolute(item.source)
        ? item.source
        : options.sourceRoot ? path.join(options.sourceRoot, item.source) : null;

      const destPath = path.isAbsolute(item.destination)
        ? item.destination
        : options.destRoot ? path.join(options.destRoot, item.destination) : null;

      if (!sourcePath || !destPath) {
        logger.error(`Cannot resolve paths for item: ${item.source}. Missing --source-root or --dest-root for relative paths.`);
        failed++;
        errors.push(`${item.source}: Missing root path for relative path.`);
        continue;
      }

      const sourceHash = await hashFile(sourcePath);
      if (options.resume && completedHashes.has(sourceHash)) {
        logger.info(`Skipping already completed: ${sourcePath}`);
        completed++;
        continue;
      }

      const logData: LogData = { ...item, source: sourcePath, destination: destPath, sourceHash, status: 'pending', startTime: new Date().toISOString() };

      try {
        if (options.dryRun) {
          logger.info(`[DRY RUN] ${item.action}: ${sourcePath} -> ${destPath}`);
        } else {
          await ensureDir(path.dirname(destPath));

          let destExists = false;
          try {
            const destHash = await hashFile(destPath);
            if (sourceHash === destHash) {
              destExists = true;
              logger.info(`Destination file already exists with same hash: ${destPath}`);
              logData.status = 'already-present';
            }
          } catch (e: any) {
            if (e.code !== 'ENOENT') throw e;
          }

          if (!destExists) {
            if (item.action === 'move') {
              logger.info(`[WARN][POLICY] Action 'move' coerced to 'copy' for ${sourcePath}`);
            }
            await copyFile(sourcePath, destPath);

            if (options.verify) {
              const destHash = await hashFile(destPath);
              if (sourceHash !== destHash) {
                throw new Error('Verification failed: source and destination hashes do not match.');
              }
              logData.destHash = destHash;
            }
          }
        }
        if (logData.status !== 'already-present') {
          logData.status = 'success';
        }
        completed++;
      } catch (e: any) {
        logData.status = 'failed';
        logData.error = e.message;
        failed++;
        errors.push(`${sourcePath}: ${e.message}`);
      }

      logData.endTime = new Date().toISOString();
      await logger.jsonl(logData, auditLogFile);
      if (!options.dryRun && logData.status === 'success') {
        await logger.jsonl({ sourceHash, status: 'success' }, stateFile);
      }

      const elapsed = Number(process.hrtime.bigint() - startTime) / 1e9;
      const rate = (completed + failed) / elapsed;
      const remaining = queue.length;
      const eta = remaining / rate;
      logger.log(`Progress: ${completed + failed}/${plan.length} | ETA: ${eta.toFixed(2)}s`);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  logger.info('Execution complete!');
  logger.info(`Total: ${plan.length}, Completed: ${completed}, Failed: ${failed}`);

  if (failed > 0) {
    logger.error('Errors:');
    for (const error of errors) {
      logger.error(`- ${error}`);
    }
    process.exit(failed > 0 && completed > 0 ? 2 : 3);
  }

  process.exit(0);
}

main().catch(err => {
  logger.error(err);
  process.exit(3);
});
