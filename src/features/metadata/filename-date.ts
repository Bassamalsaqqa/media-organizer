import type { DetectedDate } from '@/types/media';

// READ-ONLY: never modify files; only parse.

function parseDate(year: string, month: string, day: string, hour = '00', minute = '00', second = '00'): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (y < 2001 || y > 2099) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

export function detectFilenameDate(name: string): DetectedDate | undefined {
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
    // 070320080823.mp4 (DDMMYYYYHHMMSS)
    /(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})\..+$/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      let date: string | null = null;
      if (pattern.source.includes('DDMMYYYY')) { // Special handling for DDMMYYYY
        date = parseDate(match[3], match[2], match[1], match[4], match[5]);
      } else {
        date = parseDate(match[1], match[2], match[3], match[4], match[5], match[6]);
      }

      if (date) {
        return {
          date,
          source: 'filename',
          confidence: 2,
        };
      }
    }
  }

  return undefined;
}
