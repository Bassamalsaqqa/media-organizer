import type { MediaFileRef, MediaMeta, DetectedDate, MediaKind } from '@/types/media';
import { detectPhotoDate_EXIF, detectContainerDate, detectFsDate } from './sources';
import { detectFilenameDate } from './filename-date';
import { detectMediaKind, getExtension } from '@/features/media/kind';

// READ-ONLY: never modify files; only parse.

export async function detectBestDate(file: File, kind: MediaKind, name: string): Promise<DetectedDate> {
  if (kind === 'photo') {
    const exifDate = await detectPhotoDate_EXIF(file);
    if (exifDate) return exifDate;
  }

  const containerDate = await detectContainerDate(file);
  if (containerDate) return containerDate;

  const filenameDate = detectFilenameDate(name);
  if (filenameDate) return filenameDate;

  return detectFsDate(file);
}

// This is a placeholder for the old getMetadata function. 
// The logic will be moved to the planner.
export async function getMetadata(ref: MediaFileRef): Promise<MediaMeta> {
  const ext = getExtension(ref.name);
  const kind = detectMediaKind(ref.name);
  const takenDate = new Date(ref.lastModified);
  return {
    kind,
    takenDate: takenDate.toISOString(),
    year: takenDate.getUTCFullYear(),
    month: takenDate.getUTCMonth() + 1,
    extension: ext,
  };
}
