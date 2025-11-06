import { safeWrap, isSafeError } from '../errors';
import { SafeError } from '@/types/media';

describe('safeWrap', () => {
  it('should return the result of the function if it succeeds', async () => {
    const result = await safeWrap('UNKNOWN', () => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('should return a SafeError if the function throws an error', async () => {
    const error = new Error('test error');
    const result = await safeWrap('UNKNOWN', () => Promise.reject(error));

    expect(isSafeError(result)).toBe(true);
    if (isSafeError(result)) {
      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('test error');
    }
  });

  it('should include context in the SafeError', async () => {
    const error = new Error('test error');
    const context = { file: 'test.jpg' };
    const result = await safeWrap('FS_READ', () => Promise.reject(error), context);

    expect(isSafeError(result)).toBe(true);
    if (isSafeError(result)) {
      expect(result.code).toBe('FS_READ');
      expect(result.file).toBe('test.jpg');
    }
  });
});
