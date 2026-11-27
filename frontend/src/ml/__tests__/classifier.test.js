import * as tf from '@tensorflow/tfjs';
import { describe, expect, it } from 'vitest';
import { predictProbabilities, trainClassifier } from '../classifier.js';

/** Three well-separated Gaussian clusters standing in for image embeddings. */
function syntheticEmbeddings(perClass = 30, dim = 16) {
  const rows = [];
  const labels = [];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < perClass; i++) {
      rows.push(Array.from({ length: dim }, (_, d) => (d % 3 === c ? 3 : 0) + (Math.random() - 0.5)));
      labels.push(c);
    }
  }
  return { embeddings: tf.tensor2d(rows), labels };
}

describe('trainClassifier', () => {
  it('learns separable classes and reports progress', async () => {
    const { embeddings, labels } = syntheticEmbeddings();
    const epochs = [];
    const result = await trainClassifier({
      embeddings,
      labels,
      numClasses: 3,
      onEpochEnd: (epoch, total) => epochs.push([epoch, total]),
      options: { epochs: 20 },
    });
    expect(epochs).toHaveLength(20);
    expect(epochs.at(-1)).toEqual([20, 20]);
    expect(result.validationAccuracy).toBeGreaterThanOrEqual(0.9);

    const probs = predictProbabilities(result.model, embeddings.slice([0, 0], [1, -1]));
    expect(probs[0]).toHaveLength(3);
    expect(probs[0].reduce((a, b) => a + b)).toBeCloseTo(1, 4);
    result.model.dispose();
    embeddings.dispose();
  });

  it('does not leak tensors', async () => {
    const { embeddings, labels } = syntheticEmbeddings(10);
    const before = tf.memory().numTensors;
    const { model } = await trainClassifier({ embeddings, labels, numClasses: 3, options: { epochs: 2 } });
    model.dispose();
    expect(tf.memory().numTensors).toBe(before);
    embeddings.dispose();
  });

  it('rejects mismatched inputs', async () => {
    const embeddings = tf.zeros([4, 8]);
    await expect(trainClassifier({ embeddings, labels: [0, 1], numClasses: 2 })).rejects.toThrow();
    embeddings.dispose();
  });
});
