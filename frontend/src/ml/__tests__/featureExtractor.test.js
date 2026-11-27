import * as tf from '../tf.js';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fsModelHandler } from '../../../scripts/lib/fsModelHandler.mjs';
import { MODEL_PATH } from '../config.js';
import { loadFeatureExtractor } from '../featureExtractor.js';
import { imageTensorToInput } from '../preprocess.js';

const modelJson = fileURLToPath(new URL(`../../../public/${MODEL_PATH}`, import.meta.url));

describe('loadFeatureExtractor (self-hosted MobileNet weights)', () => {
  let extractor;
  beforeAll(async () => {
    extractor = await loadFeatureExtractor(fsModelHandler(modelJson));
  }, 60_000);
  afterAll(() => extractor?.dispose());

  it('outputs a 256-dim embedding per image', () => {
    const img = tf.randomUniform([240, 320, 3], 0, 255);
    const input = imageTensorToInput(img);
    const emb = extractor.embed(input);
    expect(extractor.embeddingSize).toBe(256);
    expect(emb.shape).toEqual([1, 256]);
    expect(emb.min().dataSync()[0]).toBeGreaterThanOrEqual(0); // post-ReLU
    tf.dispose([img, input, emb]);
  });

  it('gives different embeddings for different images', () => {
    const a = tf.tidy(() => extractor.embed(imageTensorToInput(tf.fill([224, 224, 3], 30))));
    const b = tf.tidy(() => extractor.embed(imageTensorToInput(tf.randomUniform([224, 224, 3], 0, 255))));
    const diff = tf.tidy(() => a.sub(b).abs().sum().dataSync()[0]);
    expect(diff).toBeGreaterThan(1);
    tf.dispose([a, b]);
  });
});
