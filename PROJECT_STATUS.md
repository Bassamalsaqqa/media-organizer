# Project Status: Local-First Media Organizer

## 1) Project Overview

This project is a local-first web application complemented by a Node.js CLI tool. Its primary purpose is to help users organize their digital media (photos and videos) by sorting them into a structured folder hierarchy (e.g., `photo/YYYY/MM` and `video/YYYY/MM`). The system identifies duplicates using file hashes (SHA-256) and generates a detailed dry-run plan before any actual file operations are performed.

The core philosophy behind this organizer is privacy-first, ensuring zero cloud dependency and no background deletion of user files. All operations are performed locally on the user's machine.

## 2) Completed Milestones

- ✅ **Web UI built (React + shadcn/ui)**: The web application provides a clear, step-by-step user interface covering:
    - **Step-1 (Folders)**: Selection of source and destination directories using the File System Access API.
    - **Step-2 (Options)**: Configuration of organization patterns and duplicate detection settings.
    - **Step-3 (Dry-Run)**: Generation and preview of the organization plan in a tabular format.
    - **Step-4 (Execute)**: Handoff to the CLI for execution.
- ✅ **File System Access API working**: Successfully integrated for folder selection and recursive scanning during dry-run plan generation.
- ✅ **Metadata + hashing implemented**: Basic metadata extraction (inferring kind from extension, takenDate from `lastModified`) and SHA-256 hashing are functional.
- ✅ **Dry-run now builds correct plan JSON**: The web app correctly generates a CLI-ready JSON plan and displays a preview table.
- ✅ **CLI built (Node + TS)**: A robust command-line interface is implemented to execute the generated plans, featuring verification, progress reporting, resume capabilities, and detailed log output.
- ✅ **Added `--source-root` and `--dest-root` flags**: The CLI now correctly resolves relative paths in the plan file based on user-provided root directories.
- ✅ **CLI now writes JSONL logs and verifies copy integrity**: Execution details are logged to `organizer-execution.log` (JSONL format), and file integrity can be verified post-copy using the `--verify` flag.
- ✅ **All operations are copy-only (no source deletion)**: The CLI is designed to only copy files to the destination. Source files are never deleted by the tool.
- ✅ **Step-4 web handoff now shows "Run with CLI" command + Download Plan**: The web UI provides a clear instruction and a copyable command snippet for executing the plan via the CLI, along with a button to download the generated plan JSON.

## 3) Planned / Next Steps

- 🔜 **Enforce copy-only policy visually in the web Options step**: Remove or disable the “Move” option in the web UI to align with the CLI's copy-only safety policy.
- 🔜 **Implement in-browser executor (optional, still copy-only)**: Develop an in-browser execution mechanism using the File System Access API, complete with a progress bar, as an alternative to the CLI.
- 🔜 **Add throughput (MB/s, ETA) to CLI progress output**: Enhance the CLI's progress reporting to include real-time throughput and estimated time of arrival.
- 🔜 **Add duplicate-by-pHash detection**: Implement perceptual hashing (pHash) to identify visually similar (near-duplicate) images.
- 🔜 **Polish UX**: Improve user experience with features like cancel/resume buttons within the web UI and localized messages.
- 🔜 **Write automated tests for CLI copy-verify and resume logic**: Develop comprehensive unit and integration tests for the CLI's core functionalities.

## 4) Safety Rules (important)

- **Never delete or move files from source folders**: The tool is designed to be non-destructive to source data.
- **Always copy and verify before marking success**: File operations prioritize data integrity.
- **Users manually delete only after confirming results**: Users are responsible for reviewing the organized media and manually deleting source files if desired.
- **CLI ignores or downgrades any “move” actions to “copy”**: All actions are treated as copies to ensure source data safety.
- **Destinations verified by hash if `--verify` flag is set**: An optional integrity check is available during CLI execution.

## 5) Developer Workflow

- **Web app editing**: `npm run dev` → `http://localhost:9002`
- **CLI usage**:
  ```bash
  cd media-organizer-cli
  npm run build
  node dist/execute-plan.js --plan "<path-to-plan.json>" --execute --verify --resume --concurrency 4 --source-root "<source>" --dest-root "<dest>"
  ```
- Both modules (web app and CLI) are designed to be independent and modular, facilitating future AI-assisted refactors.

## 6) Troubleshooting / Notes

- **Token limit errors**: Break down complex prompts into smaller, more focused feature requests.
- **ENOENT errors**: Ensure plan paths are correctly resolved using `--source-root` and `--dest-root` flags.
- **CLI logs**: Detailed execution logs are found in `organizer-execution.log`, and resume state in `.organizer-state.jsonl`.
- **Supported environments**: Windows/macOS/Linux (Node.js ≥ 20) and Chromium-based browsers for the web application.

## Next Session Prep

- **Resume point**: The next step is to enforce the copy-only policy visually in the web Options step and begin implementing the in-browser executor.
- **Reminder**: Always back up a small test dataset before running any new or modified execution plans.