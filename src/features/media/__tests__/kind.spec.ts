import { detectMediaKind, getExtension } from '../kind';

describe('media kind detection', () => {
  it('uses extension fallback when browser MIME type is empty', () => {
    expect(detectMediaKind('Entrance.avi', '')).toBe('video');
    expect(detectMediaKind('IMG_001.HEIC', '')).toBe('photo');
  });

  it('prefers MIME type when available', () => {
    expect(detectMediaKind('clip.bin', 'video/mp4')).toBe('video');
    expect(detectMediaKind('image.bin', 'image/jpeg')).toBe('photo');
  });

  it('extracts lower-case extensions', () => {
    expect(getExtension('folder/My Video.MOV')).toBe('mov');
  });
});
