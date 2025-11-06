import { SafeError, SafeErrorCode } from '@/types/media';

export async function safeWrap<T>(
  label: SafeErrorCode,
  fn: () => Promise<T>,
  ctx?: Record<string, unknown>,
): Promise<T | SafeError> {
  try {
    return await fn();
  } catch (e) {
    const err = e as Error;
    const safeError: SafeError = {
      code: label,
      message: err.message,
      cause: err.cause as string | undefined,
      stack: err.stack,
      ...ctx,
    };
    return safeError;
  }
}

export function isSafeError(value: unknown): value is SafeError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  );
}
