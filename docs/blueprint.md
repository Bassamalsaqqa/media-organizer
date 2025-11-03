# **App Name**: Media Maestro

## Core Features:

- Folder Selection: Browse and select source and destination folders using the File System Access API.
- Media Metadata Extraction: Extract metadata (date, resolution, etc.) from media files using web workers (exifr + @mediainfo/wasm).
- Media Hashing: Generate SHA256 hashes and perceptual hashes (pHash) for media files using web workers (crypto.subtle + canvas).
- Plan Generation: Build a plan to organize media files based on user-defined options and resolve potential file collisions.
- Dry-Run Execution: Simulate the execution of the plan and generate a report of the changes that would be made.
- Actual Execution: Execute the plan, moving and organizing media files with bounded concurrency and progress updates.
- Resume Drafts: Resume the draft using IndexedDB

## Style Guidelines:

- Primary color: Soft purple (#A855F7) to evoke creativity and organization.
- Background color: Light gray (#F3F4F6), providing a clean and neutral backdrop.
- Accent color: Teal (#14B8A6) for interactive elements and highlights.
- Body and headline font: 'Inter' for a modern, neutral feel.
- Code font: 'Source Code Pro' for displaying file paths or other code snippets.
- Use consistent and clear icons from Lucide to represent file types, actions, and status.
- Implement a 4-step UI (Folders → Options → Dry-Run → Execute) with shadcn/ui components such as progress bars, DataTable preview, toasts, and AlertDialog for Move.