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
