function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const diff = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += (
      (diff & 1) +
      ((diff >> 1) & 1) +
      ((diff >> 2) & 1) +
      ((diff >> 3) & 1)
    );
  }
  return distance;
}

describe('hammingDistance', () => {
  it('should return 0 for identical hashes', () => {
    const hash = 'f0f0f0f0f0f0f0f0';
    expect(hammingDistance(hash, hash)).toBe(0);
  });

  it('should return the correct distance for different hashes', () => {
    const hash1 = 'f0f0f0f0f0f0f0f0';
    const hash2 = 'f0f0f0f0f0f0f0f1';
    expect(hammingDistance(hash1, hash2)).toBe(1);
  });

  it('should return the correct distance for more different hashes', () => {
    const hash1 = 'ffffffffffffffff';
    const hash2 = '0000000000000000';
    expect(hammingDistance(hash1, hash2)).toBe(64);
  });
});
