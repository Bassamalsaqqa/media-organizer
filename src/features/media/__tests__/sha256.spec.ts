import { sha256Blob } from '../sha256';

describe('sha256Blob', () => {
  it('hashes an empty blob', async () => {
    await expect(sha256Blob(new Blob(['']))).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('hashes a small string', async () => {
    await expect(sha256Blob(new Blob(['hello world']))).resolves.toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });

  it('hashes data across internal block boundaries', async () => {
    await expect(sha256Blob(new Blob(['a'.repeat(100_000)]))).resolves.toBe(
      '6d1cf22d7cc09b085dfc25ee1a1f3ae0265804c607bc2074ad253bcc82fd81ee',
    );
  });
});
