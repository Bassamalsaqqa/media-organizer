export type MediaKind = 'photo' | 'video' | 'unknown';

export type DateSource = 'exif' | 'quicktime' | 'xmp' | 'container' | 'filename' | 'fs';

export interface DetectedDate {
  date: string; // ISO 'YYYY-MM-DDTHH:mm:ss.SSSZ' (UTC or local-naive if timezone missing)
  source: DateSource;
  confidence: 1 | 2 | 3; // 3=high (EXIF/container exact), 2=good (filename), 1=fallback (fs)
}

export interface MediaMeta {
  kind: MediaKind;
  takenDate?: string;
  year: number;
  month: number;
  extension: string;
  detectedDate?: DetectedDate;
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
  error?: SafeError;
}

export type Action = 'copy' | 'move';

export interface PlanItem {
  file: MediaFile;
  reason: 'unique' | 'duplicate-exact' | 'duplicate-near';
  destRelPath: string;
  action: Action;
  status: 'pending' | 'success' | 'error' | 'skipped';
  error?: SafeError;
  meta?: {
    policy?: 'copy-only';
  };
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


export interface ResumeState {
  planId: string;
  completedIds: string[];
  bytesCopied: number;
  startedAt: number;
  lastUpdated: number;
  version: 1;
}

export type OrgLayout = 'kind-then-date' | 'date-only';
export type DuplicateAction = 'skip' | 'copy-to-duplicates';

export interface OrganizeOptions {
  layout: OrgLayout;
  duplicateAction: DuplicateAction;
  actionForUnique: 'copy';
  enableNearDuplicate: boolean;
  pattern: string;
  detectDuplicates: boolean;
}



export interface OrganizationPlan {
  options: OrganizeOptions;
  items: PlanItem[];
  summary: PlanSummary;
}

export type SafeErrorCode =
  | 'EXIF_READ'
  | 'IMAGE_DECODE'
  | 'FS_READ'
  | 'HASH'
  | 'COPY'
  | 'POLICY'
  | 'UNKNOWN';

export interface SafeError {
  code: SafeErrorCode;
  message: string;
  cause?: string;
  file?: string;
  stack?: string;
}
