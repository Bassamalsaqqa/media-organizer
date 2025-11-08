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

  if (!options.execute && !options.dryRun) {
    options.dryRun = true;
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

  // Fail fast if roots are not provided, as they are mandatory for resolving plan paths.
  if (!options.sourceRoot || !options.destRoot) {
    logger.error('Error: --source-root and --dest-root are required arguments. Please provide the absolute paths to your source and destination directories.');
    process.exit(1);
  }

  const concurrency = options.concurrency;
  const totalItems = plan.length;
  let completedItems = 0;
  let successfulCopies = 0;
  let skippedCopies = 0;
  let failedCopies = 0;
  let totalBytesCopied = 0;
  const errors: string[] = [];
  const startTime = process.hrtime.bigint();
  let lastProgressUpdateTime = process.hrtime.bigint();
  let lastBytesCopiedAtUpdate = 0;

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

  const queue = [...plan];

  const displayProgress = () => {
    const currentTime = process.hrtime.bigint();
    const elapsedSeconds = Number(currentTime - startTime) / 1e9;
    const bytesSinceLastUpdate = totalBytesCopied - lastBytesCopiedAtUpdate;
    const timeSinceLastUpdate = Number(currentTime - lastProgressUpdateTime) / 1e9;

    let currentSpeed = 0;
    if (timeSinceLastUpdate > 0) {
      currentSpeed = (bytesSinceLastUpdate / (1024 * 1024)) / timeSinceLastUpdate; // MB/s
    }

    const remainingItems = totalItems - completedItems;
    let eta = 0;
    if (successfulCopies > 0 && totalBytesCopied > 0) {
      const avgBytesPerItem = totalBytesCopied / successfulCopies;
      eta = (remainingItems * avgBytesPerItem) / (currentSpeed * 1024 * 1024); // seconds
    }

    logger.log(
      `Progress: ${completedItems}/${totalItems} | Success: ${successfulCopies} | Skipped: ${skippedCopies} | Failed: ${failedCopies} | Speed: ${currentSpeed.toFixed(2)} MB/s | ETA: ${eta.toFixed(0)}s`
    );

    lastProgressUpdateTime = currentTime;
    lastBytesCopiedAtUpdate = totalBytesCopied;
  };

  const progressInterval = setInterval(displayProgress, 1000);

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;

      const resolvedSourceRoot = path.resolve(options.sourceRoot!);
      const resolvedDestRoot = path.resolve(options.destRoot!);

      const sourcePath = path.resolve(resolvedSourceRoot, item.source);
      const destPath = path.resolve(resolvedDestRoot, item.destination);

      if (path.relative(resolvedSourceRoot, sourcePath).startsWith('..')) {
        throw new Error(`Source path "${item.source}" is outside of the source root "${options.sourceRoot}".`);
      }
      if (path.relative(resolvedDestRoot, destPath).startsWith('..')) {
        throw new Error(`Destination path "${item.destination}" is outside of the destination root "${options.destRoot}".`);
      }

      const sourceStats = await fs.stat(sourcePath);
      const fileSize = sourceStats.size;

      const sourceHash = await hashFile(sourcePath);
      if (options.resume && completedHashes.has(sourceHash)) {
        logger.info(`Skipping already completed: ${sourcePath}`);
        skippedCopies++;
        completedItems++;
        continue;
      }

      const logData: LogData = { ...item, source: sourcePath, destination: destPath, sourceHash, status: 'pending', startTime: new Date().toISOString(), fileSize };

      try {
        if (!options.execute) {
          logger.info(`[DRY RUN] Would ${item.action}: ${sourcePath} -> ${destPath}`);
          logData.status = 'dry-run';
        } else {
          // --- Execution Mode ---
          await ensureDir(path.dirname(destPath));

          let destFileExists = false;
          try {
            await fs.stat(destPath);
            destFileExists = true;
          } catch (e: any) {
            if (e.code !== 'ENOENT') throw e;
          }
          
          if (destFileExists) {
            if (options.noOverwrite) {
              logger.info(`Skipping existing destination (--no-overwrite): ${destPath}`);
              logData.status = 'skipped-overwrite';
              skippedCopies++;
              continue;
            }
            
            const destHash = await hashFile(destPath);
            if (sourceHash === destHash) {
              logger.info(`Destination file already exists with same hash: ${destPath}`);
              logData.status = 'already-present';
              skippedCopies++;
              continue;
            }
          }

          // Perform the copy
          if (item.action === 'move') {
            logger.info(`[WARN][POLICY] Action 'move' coerced to 'copy' for ${sourcePath}`);
          }
          await copyFile(sourcePath, destPath);
          totalBytesCopied += fileSize;

          if (options.verify) {
            const destHashAfterCopy = await hashFile(destPath);
            if (sourceHash !== destHashAfterCopy) {
              throw new Error('Verification failed: source and destination hashes do not match.');
            }
            logData.destHash = destHashAfterCopy;
          }
          
          logData.status = 'success';
          successfulCopies++;
        }
      } catch (e: any) {
        logData.status = 'failed';
        logData.error = e.message;
        failedCopies++;
        errors.push(`${sourcePath}: ${e.message}`);
      } finally {
        completedItems++;
      }

      logData.endTime = new Date().toISOString();
      await logger.jsonl(logData, auditLogFile);
      if (options.execute && logData.status === 'success') {
        await logger.jsonl({ sourceHash, status: 'success' }, stateFile);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  clearInterval(progressInterval);
  displayProgress(); // Final update

  logger.info('Execution complete!');
  logger.info(`Total: ${totalItems}, Completed: ${successfulCopies}, Skipped: ${skippedCopies}, Failed: ${failedCopies}`);

  if (failedCopies > 0) {
    logger.error('Errors:');
    for (const error of errors) {
      logger.error(`- ${error}`);
    }
    process.exit(failedCopies > 0 && successfulCopies > 0 ? 2 : 3);
  }

  process.exit(0);
}

main().catch(err => {
  logger.error(err);
  process.exit(3);
});
