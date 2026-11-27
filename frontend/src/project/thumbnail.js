export const THUMB_SIZE = 112;

/** Small centre-cropped JPEG used for display and saved projects (originals aren't kept). */
export function makeThumbnail(bitmap, size = THUMB_SIZE) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const side = Math.min(bitmap.width, bitmap.height);
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Thumbnail failed'))), 'image/jpeg', 0.8),
  );
}
