export type MediaFile = {
  id: string;
  name: string;
  path: string;
  handle: FileSystemFileHandle;
  size: number;
  type: string;
};

export type MediaMetadata = {
  createdAt?: Date;
  resolution?: { width: number; height: number };
};

export type MediaHashes = {
  sha256?: string;
  pHash?: string;
};

export type EnrichedMediaFile = MediaFile & {
  metadata: MediaMetadata;
  hashes: MediaHashes;
};

export type PlanAction = {
  type: 'copy' | 'move' | 'skip';
  source: string;
  destination: string;
  reason?: 'collision' | 'duplicate';
};

export type OrganizationPlan = {
  actions: PlanAction[];
  stats: {
    totalFiles: number;
    toCopy: number;
    toMove: number;
    skipped: number;
  };
};

export type OrganizeOptions = {
  pattern: string;
  detectDuplicates: boolean;
  duplicateAction: 'skip' | 'move';
};
