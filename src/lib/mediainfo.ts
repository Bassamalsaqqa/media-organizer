export type MediaInfoInstance = Awaited<ReturnType<typeof import('mediainfo.js').default>>;

export async function getMediaInfo(): Promise<MediaInfoInstance | null> {
  if (typeof window === 'undefined' && typeof self === 'undefined') return null;
  const factory = (await import('mediainfo.js')).default;
  return factory({
    locateFile: (p: string) =>
      p.endsWith('MediaInfoModule.wasm') ? '/mediainfo/MediaInfoModule.wasm' : p,
    format: 'object',
  });
}
