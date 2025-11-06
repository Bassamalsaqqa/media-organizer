const fs = require('fs');
const path = require('path');

const srcCandidates = [
  'mediainfo.js/dist/MediaInfoModule.wasm',
  'mediainfo.js/dist/MediaInfoModule.wasm.wasm', // some dist variants
  'mediainfo.js/dist/esm-bundle/MediaInfoModule.wasm',
];

const root = process.cwd();
const publicDir = path.join(root, 'public', 'mediainfo');
fs.mkdirSync(publicDir, { recursive: true });

let found = null;
for (const rel of srcCandidates) {
  const p = path.join(root, 'node_modules', rel);
  if (fs.existsSync(p)) {
    found = p;
    break;
  }
}

if (!found) {
  console.warn('[mediainfo] WASM not found in expected paths. Please check mediainfo.js version.');
  process.exit(0);
}

const dest = path.join(publicDir, 'MediaInfoModule.wasm');
fs.copyFileSync(found, dest);
console.log(`[mediainfo] Copied WASM to ${dest}`);

const bundleDir = path.join(root, 'node_modules', 'mediainfo.js', 'dist', 'esm-bundle');
try {
  fs.mkdirSync(bundleDir, { recursive: true });
  const bundleTarget = path.join(bundleDir, 'MediaInfoModule.wasm');
  fs.copyFileSync(found, bundleTarget);
  console.log(`[mediainfo] Ensured WASM alongside esm-bundle at ${bundleTarget}`);
} catch (err) {
  console.warn('[mediainfo] Failed to mirror WASM into esm-bundle directory:', err.message);
}
