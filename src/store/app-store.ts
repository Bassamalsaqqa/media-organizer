import { create } from 'zustand';
import type { MediaFile, OrganizationPlan, OrganizeOptions, OrgLayout, DuplicateAction } from '@/types/media';

export interface LogEntry {

  timestamp: number;

  message: string;

  level: 'info' | 'error';

}



type AppState = {

  sourceHandle: FileSystemDirectoryHandle | null;

  destHandle: FileSystemDirectoryHandle | null;

  options: OrganizeOptions;

  plan: OrganizationPlan | null;

  progress: { current: number; total: number; message: string };

  logs: LogEntry[];

  currentStep: number;

  isExecuting: boolean;

  isPaused: boolean;

  abortController: AbortController | null;

  permissionError: boolean;

};



type AppActions = {

  setSourceHandle: (handle: FileSystemDirectoryHandle | null) => void;

  setDestHandle: (handle: FileSystemDirectoryHandle | null) => void;

  setOptions: (options: Partial<OrganizeOptions>) => void;

  setLayout: (layout: OrgLayout) => void;

  setDuplicateAction: (action: DuplicateAction) => void;

  setEnableNearDuplicate: (on: boolean) => void;

  setDetectDuplicates: (on: boolean) => void;

  setPlan: (plan: OrganizationPlan | null) => void;

  setProgress: (progress: { current: number; total: number; message: string }) => void;

  addLog: (log: LogEntry) => void;

  setCurrentStep: (step: number) => void;

  nextStep: () => void;

  reset: () => void;

  setIsExecuting: (isExecuting: boolean) => void;

  setIsPaused: (isPaused: boolean) => void;

  setAbortController: (abortController: AbortController | null) => void;

  setPermissionError: (error: boolean) => void;

};

const initialState: AppState = {
  sourceHandle: null,
  destHandle: null,
  options: {
    pattern: '{YYYY}/{MM}',
    detectDuplicates: true,
    enableNearDuplicate: false,
    duplicateAction: 'skip',
    actionForUnique: 'copy',
    layout: 'kind-then-date',
  },
  plan: null,
  progress: { current: 0, total: 0, message: '' },
  logs: [],
  currentStep: 0,
  isExecuting: false,
  isPaused: false,
  abortController: null,
  permissionError: false,
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,
  setSourceHandle: (sourceHandle) => set({ sourceHandle }),
  setDestHandle: (destHandle) => set({ destHandle }),
  setOptions: (options) => set((state) => ({ options: { ...state.options, ...options } })),
  setLayout: (layout) => set((state) => ({ options: { ...state.options, layout } })),
  setDuplicateAction: (duplicateAction) => set((state) => ({ options: { ...state.options, duplicateAction } })),
  setEnableNearDuplicate: (enableNearDuplicate) => set((state) => ({ options: { ...state.options, enableNearDuplicate } })),
  setDetectDuplicates: (detectDuplicates) => set((state) => ({ options: { ...state.options, detectDuplicates } })),
  setPlan: (plan) => set({ plan }),
  setProgress: (progress) => set({ progress }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setCurrentStep: (currentStep) => set({ currentStep }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  reset: () => set(initialState),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setAbortController: (abortController) => set({ abortController }),
  setPermissionError: (permissionError) => set({ permissionError }),
}));

