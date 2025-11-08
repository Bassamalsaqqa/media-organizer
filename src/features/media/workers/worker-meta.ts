import exifr from 'exifr';
import MediaInfo from 'mediainfo.js';
import type { MediaInfo as MediaInfoType } from 'mediainfo.js';
import type { MediaMeta, DetectedDate, DateSource } from '@/types/media';

type MediaInfoInstance = MediaInfoType<'object'>;

// --- Start of copied code from filename-date.ts ---

function parseDate(year: string, month: string, day: string, hour = '00', minute = '00', second = '00'): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (y < 1980 || y > 2099) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

function detectFilenameDate(name: string): DetectedDate | undefined {
  const patterns = [
    // 20140117_205643000_iOS.jpg
    /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\d{3}_iOS\.jpg$/i,
    // IMG_20140117_205643.jpg / VID_20180314_143210.mp4
    /(?:IMG|VID)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\..+$/i,
    // 2014-01-17 20.56.43.jpg / 2014-01-17 20-56-43
    /(\d{4})-(\d{2})-(\d{2})[ _](\d{2})[.-](\d{2})[.-](\d{2})\..+$/i,
    // WhatsApp Image 2019-05-03 at 14.22.10.jpeg
    /WhatsApp Image (\d{4})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})\..+$/i,
    // PXL_20211225_123456789.jpg / MVIMG_20200701_090102
    /(?:PXL|MVIMG)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\d*\..+$/i,
    // 05112007.mp4 (DDMMYYYY)
    /^(\d{2})(\d{2})(\d{4})/,
    // 070320080823.mp4 (DDMMYYYYHHMMSS) - This is ambiguous, assuming DDMMYYYY
    /(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})?\..+$/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      let date: string | null = null;
      // Special handling for ambiguous DDMMYYYY format
      if (pattern.source.includes('^') || (match.length === 7 && parseInt(match[3], 10) > 1980)) {
         date = parseDate(match[3], match[2], match[1], match[4], match[5], match[6]);
      } else {
         date = parseDate(match[1], match[2], match[3], match[4], match[5], match[6]);
      }

      if (date) {
        return { date, source: 'filename', confidence: 2 };
      }
    }
  }

  return undefined;
}

// --- End of copied code ---


async function getMediaDate(file: File, kind: 'photo' | 'video', mediaInfo: MediaInfoInstance | null): Promise<string | undefined> {
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
  return undefined;
}


let mediaInfo: MediaInfoInstance | null = null;

self.onmessage = async (event: MessageEvent<{file: File}>) => {
  const {file} = event.data;
  const kind = /^image\//.test(file.type) ? 'photo' : /^video\//.test(file.type) ? 'video' : 'unknown';

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
      extension: file.name.split('.').pop()?.toLowerCase() || '',
    };

    self.postMessage({meta});
  } catch (error) {
    console.error('Error processing file:', file.name, error);
    const fallbackDate = new Date(file.lastModified);
    const meta: MediaMeta = {
        kind,
        detectedDate: { date: fallbackDate.toISOString(), source: 'fs', confidence: 1 },
        year: fallbackDate.getUTCFullYear(),
        month: fallbackDate.getUTCMonth() + 1,
        extension: file.name.split('.').pop()?.toLowerCase() || '',
    };
    self.postMessage({ meta });
  }
};
