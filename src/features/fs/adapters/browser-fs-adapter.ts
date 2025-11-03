import type { IFsClient } from '..';

const pickDirectory: IFsClient['pickDirectory'] = async (options = { mode: 'read' }) => {
  try {
    return await window.showDirectoryPicker(options);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return null;
    }
    console.error('Error picking directory:', e);
    return null;
  }
};

const walkRecursive: IFsClient['walkRecursive'] = async function* (directoryHandle) {
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file') {
      yield entry;
    } else if (entry.kind === 'directory') {
      yield* walkRecursive(entry);
    }
  }
};

const readChunk: IFsClient['readChunk'] = async (fileHandle, { start, size }) => {
  const file = await fileHandle.getFile();
  const slice = file.slice(start, start + size);
  return slice.arrayBuffer();
};

const ensureDir: IFsClient['ensureDir'] = async (base, path) => {
  let current = base;
  const parts = path.split('/').filter(p => p.length > 0);
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
};

const copy: IFsClient['copy'] = async (sourceHandle, targetDirHandle, newName) => {
  const newFileHandle = await targetDirHandle.getFileHandle(newName || sourceHandle.name, { create: true });
  const writable = await newFileHandle.createWritable();
  const file = await sourceHandle.getFile();
  await writable.write(file);
  await writable.close();
};

const move: IFsClient['move'] = async (sourceHandle, sourceDirHandle, targetDirHandle, newName) => {
  await copy(sourceHandle, targetDirHandle, newName);
  // Note: This is not a true move/rename. It's a copy then delete.
  await sourceDirHandle.removeEntry(sourceHandle.name);
};

export const browserFsAdapter: IFsClient = {
  pickDirectory,
  walkRecursive,
  readChunk,
  ensureDir,
  copy,
  move,
};