import { indexedDbAdapter } from './adapters/indexeddb-adapter';
import type { ResumeState } from '@/types/media';

export interface IResumeApi {
    saveDraft(state: ResumeState): Promise<void>;
    loadDraft(): Promise<ResumeState | null>;
    clearDraft(): Promise<void>;
}

export function createResumeApi(): IResumeApi {
    return indexedDbAdapter;
}
