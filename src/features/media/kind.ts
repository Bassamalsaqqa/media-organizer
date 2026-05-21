import type { MediaKind } from '@/types/media';

const PHOTO_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'tif',
  'tiff',
  'bmp',
  'avif',
  'dng',
  'cr2',
  'cr3',
  'nef',
  'arw',
  'rw2',
  'orf',
  'raf',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'm4v',
  'mov',
  'avi',
  'mkv',
  'webm',
  'wmv',
  'flv',
  'mpg',
  'mpeg',
  '3gp',
  '3g2',
  'mts',
  'm2ts',
  'ts',
  'vob',
  'ogv',
  'rm',
  'rmvb',
]);

export function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function detectMediaKind(name: string, mimeType = ''): MediaKind {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';

  const extension = getExtension(name);
  if (PHOTO_EXTENSIONS.has(extension)) return 'photo';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';

  return 'unknown';
}
