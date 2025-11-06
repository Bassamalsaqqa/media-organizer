import type { MediaFile, OrganizeOptions } from '@/types/media';

const FORBIDDEN_CHARS = /[<>:"/\\|?*]/g;

function sanitize(part: string): string {
  return part.replace(FORBIDDEN_CHARS, '_').trim();
}

export function buildDestPath(file: MediaFile, options: OrganizeOptions, isDuplicate: boolean): string {
  const { meta, ref } = file;
  const year = meta.year && meta.year > 2000 ? String(meta.year) : 'unknown';
  const month = meta.month ? String(meta.month).padStart(2, '0') : '00';
  const kind = meta.kind === 'video' ? 'video' : 'photo';
  const fileName = sanitize(ref.name);

  let parts: string[];

  if (year === 'unknown') {
    if (isDuplicate) {
      parts = ['duplicates', kind, 'unknown', fileName];
    } else if (options.layout === 'kind-then-date') {
      parts = [kind, 'unknown', fileName];
    } else {
      parts = ['unknown', fileName];
    }
  } else if (isDuplicate) {
    parts = ['duplicates', kind, year, month, fileName];
  } else if (options.layout === 'kind-then-date') {
    parts = [kind, year, month, fileName];
  } else {
    parts = [year, month, fileName];
  }

  return parts.join('/');
}
