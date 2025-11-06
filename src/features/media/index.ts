import { safeWrap, isSafeError } from '@/lib/errors';
import * as logger from '@/features/logs';
import type { MediaFileRef, MediaMeta, SafeError } from '@/types/media';
import exifr from 'exifr';

export interface IMediaApi {
  getMetadata(ref: MediaFileRef): Promise<MediaMeta | SafeError>;
  hashSha256(ref: MediaFileRef): Promise<string | SafeError>;
  pHashPhoto(ref: MediaFileRef): Promise<string | SafeError>;
}

async function getMetadata(ref: MediaFileRef): Promise<MediaMeta | SafeError> {
  return safeWrap(
    'EXIF_READ',
    async () => {
      const ext = ref.name.split('.').pop()?.toLowerCase() || '';
      const kind = /jpe?g|png|gif|webp/.test(ext) ? 'photo' : /mov|mp4|mkv|avi/.test(ext) ? 'video' : 'unknown';

      try {
        const handle = ref.ref as FileSystemFileHandle;
        const file = await handle.getFile();
        const exif = await exifr.parse(file);
        const takenDate = exif?.DateTimeOriginal || exif?.CreateDate || new Date(ref.lastModified);
        return {
          kind,
          takenDate: takenDate.toISOString(),
          year: takenDate.getUTCFullYear(),
          month: takenDate.getUTCMonth() + 1,
          extension: ext,
        };
      } catch (e) {
        // Fallback for when exifr fails
        const takenDate = new Date(ref.lastModified);
        return {
          kind,
          takenDate: takenDate.toISOString(),
          year: takenDate.getUTCFullYear(),
          month: takenDate.getUTCMonth() + 1,
          extension: ext,
        };
      }
    },
    { file: ref.srcPath },
  );
}

async function hashSha256(ref: MediaFileRef): Promise<string | SafeError> {
  return safeWrap(
    'HASH',
    async () => {
      const handle = ref.ref as FileSystemFileHandle;
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    { file: ref.srcPath },
  );
}

// Function to dynamically load a script
const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Declare blockhash variable that will be available globally
declare const blockhash: any;

let blockhashLoaded = false;

async function pHashPhoto(ref: MediaFileRef): Promise<string | SafeError> {
  return safeWrap(
    'IMAGE_DECODE',
    async () => {
      if (!blockhashLoaded) {
        await loadScript('https://cdn.jsdelivr.net/npm/blockhash-js@0.1.2/dist/blockhash.min.js');
        blockhashLoaded = true;
      }

      const handle = ref.ref as FileSystemFileHandle;
      const file = await handle.getFile();
      const img = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Downscale to 128px for performance
      const MAX_SIZE = 128;
      const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
      return blockhash.blockhash(imageData, 16, 2);
    },
    { file: ref.srcPath },
  );
}

export function createMediaApi(): IMediaApi {
  return {
    getMetadata,
    hashSha256,
    pHashPhoto,
  };
}