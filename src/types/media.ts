export type MediaKind = 'photo' | 'video' | 'unknown';

export interface MediaMeta {
  kind: MediaKind;
  takenDate?: string;
  year: number;
  month: number;
  extension: string;
}

export interface MediaHashes {
  sha256?: string;
  pHash?: string;
  vSig?: string[];
}

export interface MediaFileRef {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  srcPath: string;
  ref: unknown;
}

export interface MediaFile {
  ref: MediaFileRef;
  meta: MediaMeta;
  hashes: MediaHashes;
}

export type Action = 'copy' | 'move';

export interface PlanItem {
  file: MediaFile;
  reason: 'unique' | 'duplicate-exact' | 'duplicate-near';
  destRelPath: string;
  action: Action;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export interface PlanSummary {
  totals: {
    files: number;
    photos: number;
    videos: number;
    exactDup: number;
    nearDup: number;
  };
}