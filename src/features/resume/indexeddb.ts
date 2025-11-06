import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ResumeState } from '@/types/media';

interface OrganizerDB extends DBSchema {
  checkpoints: {
    key: string;
    value: ResumeState;
  };
}

let db: IDBPDatabase<OrganizerDB>;

async function getDb() {
  if (!db) {
    db = await openDB<OrganizerDB>('organizer', 1, {
      upgrade(db) {
        db.createObjectStore('checkpoints', { keyPath: 'planId' });
      },
    });
  }
  return db;
}

export async function saveCheckpoint(state: ResumeState): Promise<void> {
  const db = await getDb();
  await db.put('checkpoints', state);
}

export async function loadCheckpoint(planId: string): Promise<ResumeState | undefined> {
  const db = await getDb();
  return db.get('checkpoints', planId);
}

export async function clearCheckpoint(planId: string): Promise<void> {
  const db = await getDb();
  await db.delete('checkpoints', planId);
}
