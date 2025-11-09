# Media Organizer Architecture Review

## High-Level Architecture
- Next.js App Router UI (`src/app`, `src/components`) drives the four-step wizard (Select Folders → Options → Dry-Run → Execute) and relies on Zustand global state (`src/store/app-store.ts`) for folder handles, options, plans, and executor progress.
- File-system abstraction (`src/features/fs`) hides browser vs. Node differences and provides recursive walking, collision-safe copying, and buffered reads.
- Metadata and hashing run inside dedicated Web Workers (`src/features/media/index.ts`, `src/features/media/workers/*`) so SHA-256, perceptual hashing, EXIF parsing, and MediaInfo container parsing never block the main thread.
- Planning (`src/features/planner`, `src/features/plan`) streams files from FS adapters, enriches them with metadata/hashes, and produces a deterministic plan plus summaries, including exact and near-duplicate detection.
- Execution exists in both the browser (`src/features/execute`) and Node CLI (`media-organizer-cli/src`). Both enforce copy-only policy, checkpoint/resume capabilities, and progress reporting.
- Safety policies (`src/constants/policy.ts`) and resume state (`src/features/resume`) ensure copy-only operations with recoverable checkpoints stored in IndexedDB.

```mermaid
graph TD
  UI[Step Components\n(Folders→Options→Dry Run→Execute)] --> Store[Zustand Store]
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
### UI & State (`src/app`, `src/components`, `src/store/app-store.ts`)
- `src/app/page.tsx` selects the current wizard component based on `useAppStore().currentStep`. `components/main-layout.tsx` renders progress navigation and reiterates the copy-only policy.
- Step components coordinate the flow: `components/steps/select-folders.tsx` captures File System Access handles; `steps/set-options.tsx` instantiates a shared `Planner`, streams progress via toasts, and stores the resulting plan; `steps/dry-run.tsx` renders the plan table with retry functionality; `steps/execute-progress.tsx` builds an `Executor`, computes a deterministic plan ID via `generatePlanId`, and offers both browser execution and CLI hand-off instructions.
- Zustand store tracks the active `Planner`, executor progress (`ExecutionProgress`), logs, and cleans up worker pools on reset.

### Filesystem Layer (`src/features/fs`)
- Browser adapter walks directory handles, wraps errors in `SafeError`, resolves destination name collisions, and enforces copy-only semantics.
- Node adapter powers SSR/CLI contexts; the CLI adds additional safety (hash verification, `--no-overwrite`).

### Metadata & Hashing (`src/features/media`, `src/features/metadata`)
- The media API now uses worker pools: `worker-meta` fetches EXIF/container metadata, falls back to filename/FS timestamps with confidence scores, and supports MediaInfo WASM; `worker-hash` performs SHA-256 and perceptual hashing.
- Shared helpers in `src/features/metadata/sources.ts` remain available for other features and are fully null-checked.

### Planner & Plan Builder (`src/features/planner`, `src/features/plan`)
- `Planner.generatePlan` streams file refs, batches progress events every 10 items, and delegates metadata/hashing to workers. If a worker returns a `SafeError`, the plan still records the file with diagnostic info.
- `PlanBuilder` maintains exact duplicate buckets (by SHA-256) and near-duplicate buckets (by pHash distance). When a photo joins a near-duplicate group, its pHash is also mapped back into the lookup table so chained duplicates (A~B, B~C) are detected. Tests in `src/features/plan/__tests__/plan-builder.spec.ts` cover exact/near duplicates, collision handling, and chained cases.

### Execution & Resume (`src/features/execute`, `media-organizer-cli/src`)
- Browser executor persists checkpoints keyed by deterministic plan IDs, resumes from idle or paused states, and updates UI progress immediately upon loading checkpoint data.
- CLI enforces `--source-root` and `--dest-root` up front, defaults to dry run when `--execute` is omitted, honors `--no-overwrite`, logs dry-run entries distinctly, and supports resume via `.organizer-state.jsonl`.

### Documentation & Testing
- README provides quick-start steps, requirements, and troubleshooting tips; CLI README documents required flags, sample commands, log snippets, and a troubleshooting matrix.
- Plan-builder unit tests exercise collision and duplicate logic; `npm run typecheck` ensures both app and CLI TypeScript remain sound.

## Status of Key Risks
1. **Near-duplicate detection** – **Fixed.** PlanBuilder maps every photo hash into its near-dup group; chained similarity is captured. (`plan-builder.spec.ts`)
2. **Plan summary drift** – **Fixed.** Counters update as files are added; `getPlan` is a pure getter.
3. **Dry-run retry** – **Fixed.** The shared planner instance is stored globally and reused for retries.
4. **Resume UX** – **Fixed.** Deterministic plan IDs, checkpoint preloading, and toast actions all drive the correct executor state.
5. **Performance bottlenecks** – **Fixed.** Hashing/metadata extraction run entirely inside workers.
6. **Execution safety** – **Fixed.** Browser executor enforces copy-only policy; CLI requires root flags, defaults to dry run, and guards against traversal/overwrites.
7. **Supply-chain risk** – **Fixed.** Perceptual hashing uses our own worker implementation; no external CDN scripts at runtime.

## Known Limitations
- **Dry-Run scaling**: The table renders every row; virtualized rendering/pagination is still pending.
- **Collision parity**: Browser adapters and CLI have separate collision logic; a shared helper would guarantee identical behavior.
- **Lack of visuals**: README references the wizard but lacks screenshots or UX walkthroughs.
- **Integration testing**: No automated end-to-end tests yet compare browser vs. CLI outputs on the same fixture set.

## Refactoring Roadmap
1. **Dry-Run pagination/filters** – Keep the UI responsive for plans with tens of thousands of entries.
2. **Shared collision helpers** – Deduplicate destination-path/collision logic between browser and CLI.
3. **End-to-end test harness** – Run planner/executor against canonical fixtures (browser + CLI) in CI.
4. **Downloadable structured logs** – Let users download JSONL execution logs directly from the UI for easier bug reports.
