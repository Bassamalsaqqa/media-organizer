import { SafeError } from '@/types/media';

export const info = (message: string, ...args: unknown[]) => {
  console.log(JSON.stringify({ level: 'info', message, args }));
};

export const warn = (message: string, ...args: unknown[]) => {
  console.warn(JSON.stringify({ level: 'warn', message, args }));
};

export const error = (e: SafeError) => {
  console.error(JSON.stringify({ level: 'error', ...e }));
};

export const toSafeError = (e: unknown, context: Record<string, unknown>): SafeError => {
  if (e instanceof Error) {
    return {
      code: 'UNKNOWN',
      message: e.message,
      stack: e.stack,
      ...context,
    };
  }
  return {
    code: 'UNKNOWN',
    message: String(e),
    ...context,
  };
};
