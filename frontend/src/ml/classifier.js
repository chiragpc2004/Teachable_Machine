import * as tf from './tf.js';
import { TRAINING_DEFAULTS } from './config.js';
import { stratifiedSplit } from './dataset.js';

/** Small trainable "head" that sits on top of the frozen MobileNet embeddings. */
export function createClassifierHead(embeddingSize, numClasses, options = {}) {
  const { hiddenUnits, dropout, learningRate } = { ...TRAINING_DEFAULTS, ...options };
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [embeddingSize], units: hiddenUnits, activation: 'relu' }),
      tf.layers.dropout({ rate: dropout }),
      tf.layers.dense({ units: numClasses, activation: 'softmax' }),
    ],
  });
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
}

/**
 * Trains a classifier head on precomputed embeddings.
 * @param {object} args
 * @param {tf.Tensor2D} args.embeddings [n, embeddingSize]
 * @param {number[]} args.labels class index per row
 * @param {number} args.numClasses
 * @param {(epoch: number, totalEpochs: number, logs: object) => void} [args.onEpochEnd]
 * @returns {Promise<{ model: tf.Sequential, validationAccuracy: number | null, validationSize: number, trainAccuracy: number }>}
 */
export async function trainClassifier({ embeddings, labels, numClasses, onEpochEnd, options = {} }) {
  const settings = { ...TRAINING_DEFAULTS, ...options };
  if (embeddings.shape[0] !== labels.length) {
    throw new Error(`Got ${embeddings.shape[0]} embeddings but ${labels.length} labels.`);
  }
  const { train, validation } = stratifiedSplit(labels, settings.validationFraction, settings.seed);

  const pick = (idx) =>
    tf.tidy(() => ({
      xs: tf.gather(embeddings, idx),
      ys: tf
        .oneHot(
          tf.tensor1d(
            idx.map((i) => labels[i]),
            'int32',
          ),
          numClasses,
        )
        .toFloat(),
    }));
  const trainSet = pick(train);
  const valSet = validation.length ? pick(validation) : null;

  const model = createClassifierHead(embeddings.shape[1], numClasses, settings);
  try {
    await model.fit(trainSet.xs, trainSet.ys, {
      epochs: settings.epochs,
      batchSize: settings.batchSize,
      shuffle: true,
      validationData: valSet ? [valSet.xs, valSet.ys] : undefined,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          onEpochEnd?.(epoch + 1, settings.epochs, logs);
          await tf.nextFrame(); // keep the UI responsive between epochs
        },
      },
    });
    return {
      model,
      validationSize: validation.length,
      trainAccuracy: accuracy(
        model,
        trainSet.xs,
        train.map((i) => labels[i]),
      ),
      validationAccuracy: valSet
        ? accuracy(
            model,
            valSet.xs,
            validation.map((i) => labels[i]),
          )
        : null,
    };
  } catch (err) {
    model.dispose();
    throw err;
  } finally {
    // Adam keeps per-weight state that model.dispose() doesn't free. We always retrain
    // from scratch, so release it as soon as training ends.
    model.optimizer?.dispose();
    tf.dispose([trainSet.xs, trainSet.ys, valSet?.xs, valSet?.ys].filter(Boolean));
  }
}

function accuracy(model, xs, trueLabels) {
  const predicted = tf.tidy(() => model.predict(xs).argMax(-1).dataSync());
  let correct = 0;
  trueLabels.forEach((label, i) => {
    if (predicted[i] === label) correct++;
  });
  return correct / trueLabels.length;
}

/** Class probabilities for each embedding row. Returns plain arrays. */
export function predictProbabilities(model, embeddings) {
  return tf.tidy(() => model.predict(embeddings).arraySync());
}
