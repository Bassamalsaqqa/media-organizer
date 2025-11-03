// Placeholder for Resume API
export interface IResumeApi {
    saveDraft(state: any): Promise<void>;
    loadDraft(): Promise<any | null>;
    clearDraft(): Promise<void>;
}
