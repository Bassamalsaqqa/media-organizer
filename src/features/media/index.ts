import type { MediaFile, MediaMetadata } from '@/types/media';

// The user has specified exifr + @mediainfo/wasm, but I am to provide placeholder logic that compiles.
// This would be implemented with a worker pool.

export interface IMediaApi {
  getMetadata(file: MediaFile): Promise<MediaMetadata>;
  hashSha256(file: MediaFile): Promise<string>;
  pHashPhoto(file: MediaFile): Promise<string>;
  pHashVideoSignature(file: MediaFile): Promise<string>;
}

// Placeholder implementation
export class MediaApi implements IMediaApi {
  async getMetadata(file: MediaFile): Promise<MediaMetadata> {
    console.log(`Extracting metadata for ${file.name}`);
    await new Promise(resolve => setTimeout(resolve, 50)); // Mock async
    return {
      createdAt: new Date(),
      resolution: { width: 1920, height: 1080 },
    };
  }

  async hashSha256(file: MediaFile): Promise<string> {
    console.log(`Hashing SHA256 for ${file.name}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Mock async
    return `sha256-${Math.random().toString(36).substring(2)}`;
  }

  async pHashPhoto(file: MediaFile): Promise<string> {
    console.log(`pHashing for photo ${file.name}`);
    await new Promise(resolve => setTimeout(resolve, 150)); // Mock async
    return `phash-photo-${Math.random().toString(36).substring(2)}`;
  }

  async pHashVideoSignature(file: MediaFile): Promise<string> {
    console.log(`pHashing for video ${file.name}`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Mock async
    return `phash-video-${Math.random().toString(36).substring(2)}`;
  }
}
