import * as tf from '@tensorflow/tfjs';
import { IMAGE_SIZE } from './config.js';

/**
 * Normalised [y1, x1, y2, x2] box for the largest centred square in a w×h image.
 * Centre-cropping (rather than squashing) keeps object proportions the same as
 * what MobileNet saw during its own training.
 */
export function centerCropBox(width, height) {
  if (!(width > 0 && height > 0)) throw new Error(`Invalid image size ${width}×${height}`);
  const side = Math.min(width, height);
  const y1 = (height - side) / 2 / height;
  const x1 = (width - side) / 2 / width;
  return [y1, x1, y1 + side / height, x1 + side / width];
}

/**
 * Turns an RGB image tensor [h, w, 3] (values 0–255) into a MobileNet input
 * [1, 224, 224, 3] scaled to [-1, 1]. Caller owns the returned tensor.
 */
export function imageTensorToInput(image) {
  return tf.tidy(() => {
    const [height, width] = image.shape;
    const batched = image.toFloat().expandDims(0);
    const cropped = tf.image.cropAndResize(
      batched,
      [centerCropBox(width, height)],
      [0],
      [IMAGE_SIZE, IMAGE_SIZE],
    );
    return cropped.div(127.5).sub(1);
  });
}

/** Browser helper: <img>, <canvas>, <video> or ImageBitmap → MobileNet input. */
export function pixelsToInput(source) {
  return tf.tidy(() => imageTensorToInput(tf.browser.fromPixels(source)));
}
