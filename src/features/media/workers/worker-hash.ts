async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function pHash(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(bitmap, 0, 0, 32, 32);
  const imageData = ctx.getImageData(0, 0, 32, 32);
  const grayscale = new Float32Array(32 * 32);

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    grayscale[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Basic DCT implementation (for simplicity)
  const dct = new Float32Array(32 * 32);
  for (let u = 0; u < 32; u++) {
    for (let v = 0; v < 32; v++) {
      let sum = 0;
      for (let i = 0; i < 32; i++) {
        for (let j = 0; j < 32; j++) {
          sum += grayscale[i * 32 + j] * Math.cos((2 * i + 1) * u * Math.PI / 64) * Math.cos((2 * j + 1) * v * Math.PI / 64);
        }
      }
      dct[u * 32 + v] = sum;
    }
  }

  // Use top-left 8x8 of DCT
  let total = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      total += dct[i * 32 + j];
    }
  }
  const avg = total / 64;

  let hash = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      hash += dct[i * 32 + j] > avg ? '1' : '0';
    }
  }

  return hash;
}

async function vSig(frames: ImageBitmap[]): Promise<string[]> {
    // This is a stub. A real implementation would run pHash on each frame.
    return frames.map(() => Math.random().toString(36).substring(2));
}

self.onmessage = async (event: MessageEvent<{ file?: File; frames?: ImageBitmap[]; type: 'sha256' | 'pHash' | 'vSig' }>) => {
  const { file, frames, type } = event.data;

  try {
    if (type === 'sha256' && file) {
      const hash = await sha256(file);
      self.postMessage({ hash });
    } else if (type === 'pHash' && file) {
      const hash = await pHash(file);
      self.postMessage({ pHash: hash });
    } else if (type === 'vSig' && frames) {
        const signature = await vSig(frames);
        self.postMessage({ vSig: signature });
    }
  } catch (error) {
    console.error('Error hashing file:', error);
    self.postMessage({ error: 'Failed to hash file' });
  }
};
