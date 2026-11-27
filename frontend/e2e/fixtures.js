import jpeg from 'jpeg-js';

/**
 * Synthetic JPEG of a noisy, mostly-`hue` image ('red' | 'blue'), so E2E tests
 * need no binary fixtures and the two classes are trivially separable.
 */
export function syntheticImage(hue, seed, size = 96) {
  let s = seed * 9973 + (hue === 'red' ? 1 : 2);
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const strong = 170 + rand() * 80;
    const weak = 20 + rand() * 60;
    data[i * 4] = hue === 'red' ? strong : weak;
    data[i * 4 + 1] = weak;
    data[i * 4 + 2] = hue === 'blue' ? strong : weak;
    data[i * 4 + 3] = 255;
  }
  return {
    name: `${hue}-${seed}.jpg`,
    mimeType: 'image/jpeg',
    buffer: jpeg.encode({ data, width: size, height: size }, 90).data,
  };
}

export const images = (hue, n, offset = 0) =>
  Array.from({ length: n }, (_, i) => syntheticImage(hue, i + offset));

/** A dataset zip as produced by macOS "Compress": wrapper folder + __MACOSX junk. */
export async function datasetZip(perClass = 6) {
  const { zipSync } = await import('fflate');
  const files = { 'pets/': new Uint8Array(), '__MACOSX/pets/._red': new Uint8Array([0]) };
  for (const hue of ['red', 'blue']) {
    for (const img of images(hue, perClass)) files[`pets/${hue}/${img.name}`] = new Uint8Array(img.buffer);
  }
  files['pets/notes.txt'] = new TextEncoder().encode('ignore me');
  return { name: 'pets.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync(files)) };
}

/** A phone-camera-sized (4032×3024) mostly-red JPEG: a smooth gradient, so it stays small on disk. */
export function largePhoto(name = 'large-red.jpg') {
  const width = 4032;
  const height = 3024;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = (180 + (x * 60) / width) | 0;
      data[i + 1] = (30 + (y * 40) / height) | 0;
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
  }
  return { name, mimeType: 'image/jpeg', buffer: jpeg.encode({ data, width, height }, 85).data };
}
