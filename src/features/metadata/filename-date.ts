import type { DetectedDate } from '@/types/media';

// READ-ONLY: never modify files; only parse.

function parseDate(year: string, month: string, day: string, hour = '00', minute = '00', second = '00'): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const h = parseInt(hour || '00', 10);
  const min = parseInt(minute || '00', 10);
  const s = parseInt(second || '00', 10);

  if (y < 1980 || y > 2099) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (h < 0 || h > 23) return null;
  if (min < 0 || min > 59) return null;
  if (s < 0 || s > 59) return null;

  const date = new Date(Date.UTC(y, m - 1, d, h, min, s));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

export function detectFilenameDate(name: string): DetectedDate | undefined {
  const patterns: Array<{ pattern: RegExp; order: 'ymd' | 'dmy' | 'mdy' }> = [
    { pattern: /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\d{3}_iOS\.[^.]+$/i, order: 'ymd' },
    { pattern: /(?:IMG|VID|PXL|MVIMG)[_-](\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})\d*\.[^.]+$/i, order: 'ymd' },
    { pattern: /(?:IMG|VID)-(\d{4})(\d{2})(\d{2})-WA\d+\.[^.]+$/i, order: 'ymd' },
    { pattern: /(\d{4})[-_.](\d{2})[-_.](\d{2})[ _-](\d{2})[.-](\d{2})[.-](\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /(\d{4})[-_.](\d{2})[-_.](\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /WhatsApp (?:Image|Video) (\d{4})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /Signal-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /(?:Screenshot|Screen Recording)[ _-](\d{4})[-_](\d{2})[-_](\d{2})[ _-](\d{2})[-_.](\d{2})[-_.](\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /Screenshot_(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /(\d{4})(\d{2})(\d{2})[-_ ]?(\d{2})(\d{2})(\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /(\d{4})(\d{2})(\d{2})\.[^.]+$/i, order: 'ymd' },
    { pattern: /(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})?\.[^.]+$/i, order: 'dmy' },
    { pattern: /(\d{2})-(\d{2})-(\d{4})[ _-](\d{2})[.-](\d{2})[.-](\d{2})\.[^.]+$/i, order: 'dmy' },
    { pattern: /(\d{2})-(\d{2})-(\d{4})\.[^.]+$/i, order: 'dmy' },
  ];

  for (const { pattern, order } of patterns) {
    const match = name.match(pattern);
    if (match) {
      let date: string | null;
      if (order === 'dmy') {
        date = parseDate(match[3], match[2], match[1], match[4], match[5], match[6]);
      } else if (order === 'mdy') {
        date = parseDate(match[3], match[1], match[2], match[4], match[5], match[6]);
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
