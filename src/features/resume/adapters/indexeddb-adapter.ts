import type { IResumeApi } from '..';
import type { ResumeState } from '@/types/media';
import { openDB } from 'idb';

const DB_NAME = 'media-organizer-draft';
const STORE_NAME = 'draft';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

async function saveDraft(state: ResumeState): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, state, 'current');
}

async function loadDraft(): Promise<ResumeState | null> {
  const db = await getDb();
  return db.get(STORE_NAME, 'current');
}

async function clearDraft(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, 'current');
}

export const indexedDbAdapter: IResumeApi = {
  saveDraft,
  loadDraft,
  clearDraft,
};