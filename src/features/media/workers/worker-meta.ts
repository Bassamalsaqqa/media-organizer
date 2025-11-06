import exifr from 'exifr';
import {getMediaInfo, type MediaInfoInstance} from '@/lib/mediainfo';
import type {MediaMeta} from '@/types/media';

async function extractImageMeta(file: File): Promise<MediaMeta> {
  const meta = await exifr.parse(file);
  const takenDate = meta?.DateTimeOriginal || meta?.CreateDate;
  const date = takenDate ? new Date(takenDate) : new Date(file.lastModified);

  return {
    kind: 'photo',
    takenDate: takenDate ? date.toISOString() : undefined,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    extension: file.name.split('.').pop()?.toLowerCase() || '',
  };
}

async function extractVideoMeta(file: File, mediaInfo: MediaInfoInstance): Promise<MediaMeta> {
  const result = await mediaInfo.analyzeData(
    () => file.size,
    (chunkSize, offset) =>
      file
        .slice(offset, offset + chunkSize)
        .arrayBuffer()
        .then((b) => new Uint8Array(b))
  );

  const track = (result as any).media?.track.find((t: any) => t['@type'] === 'General') as any;
  const takenDateStr = track?.Encoded_Date || track?.File_Created_Date;
  const date = takenDateStr ? new Date(takenDateStr) : new Date(file.lastModified);

  return {
    kind: 'video',
    takenDate: takenDateStr ? date.toISOString() : undefined,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    extension: file.name.split('.').pop()?.toLowerCase() || '',
  };
}

let mediaInfo: MediaInfoInstance | null = null;

self.onmessage = async (event: MessageEvent<{file: File}>) => {
  const {file} = event.data;

  try {
    if (!mediaInfo) {
      mediaInfo = await getMediaInfo();
    }

    if (!mediaInfo) {
      throw new Error('MediaInfo not initialized');
    }

    let meta: MediaMeta;
    if (/^image\//.test(file.type)) {
      meta = await extractImageMeta(file);
    } else if (/^video\//.test(file.type)) {
      meta = await extractVideoMeta(file, mediaInfo);
    } else {
      const fallbackDate = new Date(file.lastModified);
      meta = {
        kind: 'unknown',
        year: fallbackDate.getUTCFullYear(),
        month: fallbackDate.getUTCMonth() + 1,
        extension: file.name.split('.').pop()?.toLowerCase() || '',
      };
    }
    self.postMessage({meta});
  } catch (error) {
    console.error('Error processing file:', file.name, error);
    self.postMessage({error: 'Failed to process file'});
  }
};
