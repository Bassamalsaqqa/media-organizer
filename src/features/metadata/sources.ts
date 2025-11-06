import type { DetectedDate } from '@/types/media';
import exifr from 'exifr';
import { getMediaInfo } from '@/lib/mediainfo';

// READ-ONLY: never modify files; only parse.

export async function detectPhotoDate_EXIF(file: File): Promise<DetectedDate | undefined> {
  try {
    const exif = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'OffsetTime', 'SubSecTimeOriginal'] });
    if (exif && (exif.DateTimeOriginal || exif.CreateDate)) {
      const date = exif.DateTimeOriginal || exif.CreateDate;
      let isoDate = date.toISOString();
      if (exif.SubSecTimeOriginal) {
        isoDate = isoDate.replace('.000Z', `.${exif.SubSecTimeOriginal}Z`);
      }
      return { date: isoDate, source: 'exif', confidence: 3 };
    }
  } catch (e) {
    // Ignore errors
  }
  return undefined;
}

export async function detectContainerDate(file: File): Promise<DetectedDate | undefined> {
  try {
    const mediaInfo = await getMediaInfo();
    if (!mediaInfo) return undefined; // SSR/edge render pass

        const result = await mediaInfo.analyzeData(
      () => file.size,
      async (chunkSize, offset) => {
        const buffer = await file.slice(offset, offset + chunkSize).arrayBuffer();
        return new Uint8Array(buffer);
      }
    );

    const tracks = result.media.track;
    const generalTrack = tracks.find((t: any) => t['@type'] === 'General');

    if (generalTrack) {
      const dateFields = ['com.apple.quicktime.creationdate', 'creation_time', 'mediaCreateDate', 'Encoded_Date', 'Tagged_Date'];
      for (const field of dateFields) {
        if (generalTrack[field]) {
          return { date: new Date(generalTrack[field]).toISOString(), source: 'container', confidence: 3 };
        }
      }
    }
  } catch (e) {
    // Ignore errors
  } finally {
    // mediaInfo.close(); // MediaInfo instance is managed by the wrapper, no need to close here
  }
  return undefined;
}

export async function detectFsDate(file: File): Promise<DetectedDate> {
  return {
    date: new Date(file.lastModified).toISOString(),
    source: 'fs',
    confidence: 1,
  };
}
