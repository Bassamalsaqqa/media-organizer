# QA_CHECKLIST.md
### Local-First Media Organizer – Quality Assurance Guide
_Last updated: {{today}}_

## 🎯 Objective
Confirm that every release preserves safety (copy-only), stability (no leaks), and correctness of file organization across both Web and CLI executors.

---

## 🧱 Core Safety Tests
| # | Scenario | Expected Result |
|---|-----------|-----------------|
| 1 | **Copy-Only Policy** | Source files remain intact. No deletions, renames, or timestamp changes. |
| 2 | **Duplicate Handling** | Duplicates placed in `duplicates/<type>/<YYYY>/<MM>/` without overwriting originals. |
| 3 | **Near-Duplicate Handling** | Visually similar photos (pHash Hamming distance <= 9) are identified and routed to `duplicates/<type>/<YYYY>/<MM>/` if enabled. |
| 4 | **Collision Handling** | Destination name conflicts resolved as `file_(1).ext`. || 4 | **Abort / Permission Denied** | App shows toast “Permission denied” and stops gracefully. |
| 5 | **Power Interruption** | On reload or resume, skipped items continue; no duplicates. |

---

## 💻 Web App – Functional Checks
| Area | Steps | Expected |
|------|-------|----------|
| **1. Folder Picker** | Open any folder outside app dir; cancel once; approve once. | Toast on cancel; correct path on select. |
| **2. Options Step** | Verify only “Copy” option shown; move hidden. | ✅ “Copy” enforced. |
| **3. Dry-Run** | Scan 20–50 mixed files. | Progress visible; plan preview correct. |
| **4. Execute (Browser)** | Run with “Run in Browser”. | Speed (MB/s) + ETA update smoothly; copy finishes; success toast. |
| **5. Resume** | Refresh mid-execution; click Resume. | Continues from checkpoint. |
| **6. Long-Run** | Run >1000 files. | Memory steady (DevTools Memory tab). |

---

## 🧰 CLI – Functional Checks
| Test | Command | Expectation |
|------|----------|-------------|
| **Basic Execution** | `node dist/execute-plan.js --plan ... --execute --verify --source-root ... --dest-root ...` | Copies files correctly, no deletions. |
| **Already-Present Handling** | Re-run same plan. | Marks as `already-present`, skips copy. |
| **Conflict Handling** | Pre-create a dest duplicate. | Creates `_ (1)` version. |
| **Resume** | Interrupt mid-run → rerun with `--resume`. | Continues from checkpoint. |
| **Verify Flag** | Use `--verify`. | Hash comparison succeeds. |
| **Performance** | Observe throughput and ETA. | Stable MB/s; ETA converges; includes success/skipped/failed counts. |
---

## ⚙️ Performance & Resource
1. Concurrency adapts to CPU cores; no browser freeze.
2. Chunked copies (8–32 MB) → no RAM spikes.
3. Monitor DevTools → memory stays flat.
4. CLI memory steady for multi-GB runs.

---

## 📋 UX & Feedback
- Toast on cancel, success, and errors.
- Progress bar accurate to < 5 % error.
- Speed/ETA visible; total time logged.
- Safety notice visible before execution.

---

## 🧩 Regression Checklist (every commit)
- [ ] `npm run build` succeeds in both Web and CLI.
- [ ] TypeScript strict mode passes.
- [ ] `.gitignore` excludes logs, node_modules, plans.
- [ ] Copy-only verified on 3-file smoke test.
- [ ] Dry-Run JSON exports valid.
- [ ] Browser + CLI produce identical directory structures.

---

## ✅ Release Readiness
Before tagging a release:
1. Run all tests above.
2. Verify memory profile stable for at least 30 min.
3. Update `PROJECT_STATUS.md` date and version.
4. Tag commit:  
   ```bash
   git tag -a vX.Y.Z -m "Stable copy-only release"
   git push --tags

Reviewer: Bassam Alsaqqa
Policy: Copy-Only. Never delete source files.