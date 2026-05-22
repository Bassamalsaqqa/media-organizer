import exifr from 'exifr';
import MediaInfo from 'mediainfo.js';
import type { MediaInfo as MediaInfoType } from 'mediainfo.js';
import type { MediaMeta, DetectedDate } from '@/types/media';
import { detectMediaKind, getExtension } from '../kind';
import { detectFilenameDate } from '../../metadata/filename-date';

type MediaInfoInstance = MediaInfoType<'object'>;

async function getMediaDate(file: File, kind: 'photo' | 'video', mediaInfo: MediaInfoInstance | null): Promise<string | undefined> {
  try {
    if (kind === 'photo') {
      const meta = await exifr.parse(file);
      const takenDate = meta?.DateTimeOriginal || meta?.CreateDate;
      return takenDate ? new Date(takenDate).toISOString() : undefined;
    }
    if (kind === 'video') {
      if (!mediaInfo) return undefined;
      const result = await mediaInfo.analyzeData(
        () => file.size,
        (chunkSize: number, offset: number) =>
          file
            .slice(offset, offset + chunkSize)
            .arrayBuffer()
            .then((b) => new Uint8Array(b))
      );
      const track = (result as any).media?.track.find((t: any) => t['@type'] === 'General') as any;
      const takenDateStr = track?.Encoded_Date || track?.File_Created_Date;
      return takenDateStr ? new Date(takenDateStr).toISOString() : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}


let mediaInfo: MediaInfoInstance | null = null;

self.onmessage = async (event: MessageEvent<{file: File}>) => {
  const {file} = event.data;
  const kind = detectMediaKind(file.name, file.type);

  try {
    if (!mediaInfo && kind === 'video') {
      mediaInfo = await MediaInfo({
        locateFile: (p: string) => p.endsWith('MediaInfoModule.wasm') ? '/mediainfo/MediaInfoModule.wasm' : p,
        format: 'object',
      });
    }

    let detectedDate: DetectedDate;
    let mediaDate: string | undefined = undefined;

    // 1. Try EXIF/container metadata
    if (kind === 'photo' || kind === 'video') {
      mediaDate = await getMediaDate(file, kind, mediaInfo);
    }

    if (mediaDate) {
      detectedDate = { date: mediaDate, source: 'container', confidence: 3 };
    } else {
      // 2. Try filename
      const filenameDate = detectFilenameDate(file.name);
      if (filenameDate) {
        detectedDate = { ...filenameDate, confidence: 2 };
      } else {
        // 3. Fallback to filesystem
        detectedDate = { date: new Date(file.lastModified).toISOString(), source: 'fs', confidence: 1 };
      }
    }
    
    const date = new Date(detectedDate.date);
    const meta: MediaMeta = {
      kind,
      detectedDate,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      extension: getExtension(file.name),
    };

    self.postMessage({meta});
  } catch (error) {
    const fallbackDate = new Date(file.lastModified);
    const meta: MediaMeta = {
        kind,
        detectedDate: { date: fallbackDate.toISOString(), source: 'fs', confidence: 1 },
        year: fallbackDate.getUTCFullYear(),
        month: fallbackDate.getUTCMonth() + 1,
        extension: getExtension(file.name),
    };
    self.postMessage({ meta });
  }
};
