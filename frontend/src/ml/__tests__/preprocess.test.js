import * as tf from '@tensorflow/tfjs';
import { describe, expect, it } from 'vitest';
import { centerCropBox, imageTensorToInput } from '../preprocess.js';

describe('centerCropBox', () => {
  it('is the full image for squares', () => {
    expect(centerCropBox(100, 100)).toEqual([0, 0, 1, 1]);
  });
  it('crops the sides of landscape images', () => {
    expect(centerCropBox(200, 100)).toEqual([0, 0.25, 1, 0.75]);
  });
  it('crops top and bottom of portrait images', () => {
    expect(centerCropBox(100, 400)).toEqual([0.375, 0, 0.625, 1]);
  });
  it('rejects empty images', () => {
    expect(() => centerCropBox(0, 10)).toThrow();
  });
});

describe('imageTensorToInput', () => {
  it('produces a [1,224,224,3] tensor scaled to [-1, 1]', () => {
    const img = tf.randomUniform([120, 300, 3], 0, 255, 'int32');
    const input = imageTensorToInput(img);
    expect(input.shape).toEqual([1, 224, 224, 3]);
    const [min, max] = [input.min().dataSync()[0], input.max().dataSync()[0]];
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    tf.dispose([img, input]);
  });

  it('keeps only the centre square', () => {
    // 300×100 image: white centre square, black side bands (100px each).
    const img = tf.tidy(() =>
      tf.concat([tf.zeros([100, 100, 3]), tf.fill([100, 100, 3], 255), tf.zeros([100, 100, 3])], 1),
    );
    const input = imageTensorToInput(img);
    // Interior pixels must all be white (1.0); allow bilinear blending at the very edge.
    const interior = input.slice([0, 2, 2, 0], [1, 220, 220, 3]);
    expect(interior.min().dataSync()[0]).toBeCloseTo(1, 5);
    tf.dispose([img, input, interior]);
  });
});
