import { IResumeApi } from '..';

const DB_NAME = 'MediaOrganizer';
const STORE_NAME = 'draft';
const DRAFT_KEY = 'current-draft';

// Placeholder for IndexedDB adapter
class IndexedDbResumeAdapter implements IResumeApi {
    private db: Promise<IDBDatabase>;

    constructor() {
        if (typeof window === 'undefined') {
            this.db = Promise.reject(new Error('IndexedDB not available on server'));
            return;
        }

        this.db = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(STORE_NAME);
            };
        });
    }
    
    async saveDraft(state: any): Promise<void> {
        const db = await this.db;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(state, DRAFT_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async loadDraft(): Promise<any | null> {
        const db = await this.db;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(DRAFT_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async clearDraft(): Promise<void> {
        const db = await this.db;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(DRAFT_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
}

let resumeApi: IResumeApi | null = null;
export const getResumeApi = (): IResumeApi => {
    if (typeof window === 'undefined') {
        return {
            saveDraft: async () => {},
            loadDraft: async () => null,
            clearDraft: async () => {},
        };
    }
    if (!resumeApi) {
        resumeApi = new IndexedDbResumeAdapter();
    }
    return resumeApi;
};
