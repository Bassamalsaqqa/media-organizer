# Media Organizer Architecture Review

## High-Level Architecture
- Next.js App Router UI (`src/app`, `src/components`) drives the four-step wizard (Select Folders ? Options ? Dry-Run ? Execute) and relies on Zustand global state for folder handles, options, plans, and executor progress.
- File-system abstraction (`src/features/fs`) hides browser vs. Node differences and provides recursive walking, collision-safe copying, and buffered reads.
- Metadata and hashing run inside dedicated Web Workers (`src/features/media`) so SHA-256, perceptual hashing, EXIF parsing, and MediaInfo container parsing never block the main thread.
- Planning (`src/features/planner`, `src/features/plan`) streams files from FS adapters, enriches them with metadata/hashes, and produces a deterministic plan plus summaries, including exact and near-duplicate detection.
- Execution exists in both the browser (`src/features/execute`) and Node CLI (`media-organizer-cli/src`). Both enforce copy-only policy, checkpoint/resume capabilities, and progress reporting.
- Safety policies (`src/constants/policy.ts`) and resume state (`src/features/resume`) ensure copy-only operations with recoverable checkpoints stored in IndexedDB.

```mermaid
graph TD
  UI[Step Components\n(Folders?Options?Dry Run?Execute)] --> Store[Zustand Store]
  Store --> Planner
  Planner --> FSClient
  Planner --> MediaWorkers[Metadata & Hash Workers]
  MediaWorkers --> Planner
  Planner --> PlanBuilder
  PlanBuilder --> PlanJSON[Plan Export]
  PlanJSON --> CLI[Node CLI Executor]
  Store --> Executor
  Executor --> FSClient
  Executor --> ResumeDB[IndexedDB]
  CLI --> Logs[JSONL Logs]
```

## Module-by-Module Insights
### UI & State
- `src/app/page.tsx` selects the current wizard component based on `useAppStore().currentStep`. `MainLayout` renders progress navigation and copy-only messaging.
- Step components coordinate: `select-folders` captures File System Access handles; `set-options` instantiates a shared `Planner`, streams progress via toasts, and stores the resulting plan; `dry-run` renders plan items with retry (now reusing the stored planner); `execute-progress` builds an `Executor`, computes a deterministic plan ID via `generatePlanId`, and offers browser execution plus CLI instructions.
- Zustand store (`src/store/app-store.ts`) now tracks the active `Planner`, executor progress (`ExecutionProgress`), and cleans up worker pools on reset.

### Filesystem Layer
- Browser adapter (`src/features/fs/adapters/browser-fs-adapter.ts`) walks handles, wraps errors in `SafeError`, resolves name collisions, and enforces copy-only policy.
- Node adapter is used for SSR/CLI contexts; the CLI itself handles additional collision logic and verification.

### Metadata & Hashing
- `src/features/media/index.ts` spawns worker pools: `worker-meta` handles EXIF/container parsing + filename/FS fallbacks with confidence levels, while `worker-hash` performs SHA-256 and perceptual hashing. Pools can be destroyed to free resources.
- `src/features/metadata/sources.ts` remains as reusable helpers for date detection; MediaInfo access is now properly null-checked.

### Planner & Plan Builder
- `Planner.generatePlan` streams files, batches progress updates every 10 items, and delegates metadata/hashing to workers. Failed metadata/hashing operations return `MediaFile` entries with `SafeError` metadata so the plan can surface issues.
- `PlanBuilder` now maintains both exact duplicate groups and near-duplicate groups keyed by pHash distance. New hashes added to a near-duplicate group are also mapped back into the lookup table, ensuring “chained” near duplicates (A~B, B~C) are detected. Unit tests in `src/features/plan/__tests__/plan-builder.spec.ts` cover exact duplicates, near duplicates, collision resolution, and the chained scenario.

### Execution & Resume
- Browser executor (`src/features/execute`) persists checkpoints keyed by deterministic plan IDs, resumes from either idle or paused states, and updates the UI immediately with checkpoint data. Errors during execution accumulate in the progress state for display in the Execute step.
- CLI (`media-organizer-cli/src/execute-plan.ts`) now enforces `--source-root` and `--dest-root` up front, defaults to dry-run mode when `--execute` isn’t supplied, honors `--no-overwrite`, and logs dry-run entries distinctly. Both success and dry-run actions emit audit JSONL entries.

### Documentation & Testing
- README highlights worker-based processing and the mandatory CLI root flags. The CLI README reiterates the requirement and provides sample commands.
- Architecture review (this document) reflects the latest implementation.
- Unit coverage expanded with the plan-builder test suite; `npm run typecheck` ensures TS safety across both the app and CLI.

## Status of Key Risks
1. **Near-duplicate detection** – **Fixed.** PlanBuilder now maps every photo hash into its near-dup group, so transitive matches are classified correctly. Tested via `plan-builder.spec.ts`.
2. **Plan summary drift** – **Fixed.** Duplicate counters update inside `addFile`, and `getPlan` is a pure getter.
3. **Dry-run retry** – **Fixed.** The shared planner instance lives in the store; retry uses the existing plan builder context.
4. **Resume UX** – **Fixed.** Deterministic plan IDs, checkpoint preloading, idle resume, and toast actions now invoke the correct executor.
5. **Performance bottlenecks** – **Fixed.** Hashing and metadata extraction run in worker pools, preventing UI stalls.
6. **Execution safety (CLI/browser)** – **Fixed.** CLI requires root flags, defaults to dry run, honors no-overwrite, and guards against traversal; browser executor enforces copy-only policy and checkpoints deterministically.
7. **Supply-chain risk** – **Fixed.** Perceptual hashing is implemented in our worker; no CDN script injection.

## Refactoring Roadmap (Next Steps)
1. **Progress/pagination in Dry-Run** – paginate/filter plan items for very large libraries to keep the UI responsive.
2. **Unified collision handling** – share collision-resolution helpers between browser FS adapter and CLI to guarantee identical outputs.
3. **Integration tests** – add end-to-end CLI + browser tests that operate on the same fixture set to ensure parity.
4. **Structured logging download** – expose JSONL download of execution logs directly from the UI for easier debugging.
