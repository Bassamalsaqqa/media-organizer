import { create } from 'zustand';
import type { MediaFile, OrganizationPlan, OrganizeOptions } from '@/types/media';

type AppState = {
  sourceHandle: FileSystemDirectoryHandle | null;
  destHandle: FileSystemDirectoryHandle | null;
  files: MediaFile[];
  options: OrganizeOptions;
  plan: OrganizationPlan | null;
  progress: { current: number; total: number; message: string };
  logs: string[];
  currentStep: number;
};

type AppActions = {
  setSourceHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setDestHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setFiles: (files: MediaFile[]) => void;
  setOptions: (options: Partial<OrganizeOptions>) => void;
  setPlan: (plan: OrganizationPlan | null) => void;
  setProgress: (progress: { current: number; total: number; message: string }) => void;
  addLog: (log: string) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
};

const initialState: AppState = {
  sourceHandle: null,
  destHandle: null,
  files: [],
  options: {
    pattern: '{YYYY}/{MM}',
    detectDuplicates: true,
    duplicateAction: 'skip',
  },
  plan: null,
  progress: { current: 0, total: 0, message: '' },
  logs: [],
  currentStep: 0,
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,
  setSourceHandle: (handle) => set({ sourceHandle: handle }),
  setDestHandle: (handle) => set({ destHandle: handle }),
  setFiles: (files) => set({ files }),
  setOptions: (options) => set((state) => ({ options: { ...state.options, ...options } })),
  setPlan: (plan) => set({ plan }),
  setProgress: (progress) => set({ progress }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setCurrentStep: (step) => set({ currentStep: step }),
  reset: () => set(initialState),
}));
