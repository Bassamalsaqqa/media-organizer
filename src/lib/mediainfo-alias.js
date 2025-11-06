import mediainfoFactory from 'mediainfo.js';

export default function createMediaInfo(options = {}) {
  return mediainfoFactory({
    ...options,
    locateFile: (p) =>
      p.endsWith('MediaInfoModule.wasm') ? '/mediainfo/MediaInfoModule.wasm' : p,
  });
}
