// Measures how well the in-browser training pipeline works on real photos, in Node.
// It runs the same src/ml code the app uses, on TF.js's pure-JS CPU backend.
//
// Protocol per run: train on --per-class images of each class (what a user would supply),
// then score on --test-per-class *different* images the model never saw.
// --baseline also trains the same head on raw 32×32 pixels (roughly what the old
// scikit-learn backend did) so you can see what transfer learning buys.
//
// Usage:
//   node scripts/validate-model.mjs <dataset-dir> [--classes a,b,c] [--per-class 30]
//        [--test-per-class 50] [--runs 5] [--baseline]
// <dataset-dir> holds one sub-folder of JPEGs per class (e.g. TensorFlow's flower_photos).
import * as tf from '@tensorflow/tfjs';
import jpeg from 'jpeg-js';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { fsModelHandler } from './lib/fsModelHandler.mjs';
import { MODEL_PATH } from '../src/ml/config.js';
import { loadFeatureExtractor } from '../src/ml/featureExtractor.js';
import { imageTensorToInput } from '../src/ml/preprocess.js';
import { predictProbabilities, trainClassifier } from '../src/ml/classifier.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    classes: { type: 'string' },
    'per-class': { type: 'string', default: '30' },
    'test-per-class': { type: 'string', default: '50' },
    runs: { type: 'string', default: '5' },
    baseline: { type: 'boolean', default: false },
  },
});
const [dataDir] = positionals;
if (!dataDir) {
  console.error(
    'Usage: node scripts/validate-model.mjs <dataset-dir> [--classes a,b] [--per-class 30] [--runs 5]',
  );
  process.exit(1);
}
const perClass = Number(values['per-class']);
const testPerClass = Number(values['test-per-class']);
const runs = Number(values.runs);

const allClasses = (await readdir(dataDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const classes = values.classes ? values.classes.split(',') : allClasses.slice(0, 3);

const modelJson = fileURLToPath(new URL(`../public/${MODEL_PATH}`, import.meta.url));
const extractor = await loadFeatureExtractor(fsModelHandler(modelJson));

// Embed a pool per class once (enough for training + test); runs re-sample from it.
const poolSize = perClass + testPerClass;
const pool = classes.map(() => []); // pool[label] = [{ embedding, pixels }]
let embedMs = 0;
let embedCount = 0;
for (const [label, name] of classes.entries()) {
  const files = (await readdir(join(dataDir, name))).filter((f) => /\.jpe?g$/i.test(f)).sort();
  if (files.length < poolSize) throw new Error(`"${name}" has ${files.length} images; need ${poolSize}.`);
  for (const file of files.slice(0, poolSize)) {
    const { width, height, data } = jpeg.decode(await readFile(join(dataDir, name, file)), {
      useTArray: true,
      formatAsRGBA: false,
      maxMemoryUsageInMB: 1024,
    });
    const t0 = performance.now();
    const sample = tf.tidy(() => {
      const img = tf.tensor3d(data, [height, width, 3], 'int32');
      const input = imageTensorToInput(img);
      return {
        embedding: extractor.embed(input).arraySync()[0],
        pixels: values.baseline ? tf.image.resizeBilinear(input, [32, 32]).reshape([-1]).arraySync() : null,
      };
    });
    embedMs += performance.now() - t0;
    embedCount++;
    pool[label].push(sample);
  }
}

function shuffled(arr, seed) {
  let s = seed;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function evaluate(feature, seed) {
  const train = { rows: [], labels: [] };
  const test = { rows: [], labels: [] };
  pool.forEach((samples, label) => {
    const s = shuffled(samples, seed * 31 + label);
    s.slice(0, perClass).forEach((x) => (train.rows.push(x[feature]), train.labels.push(label)));
    s.slice(perClass).forEach((x) => (test.rows.push(x[feature]), test.labels.push(label)));
  });
  const xs = tf.tensor2d(train.rows);
  const t0 = performance.now();
  const { model } = await trainClassifier({
    embeddings: xs,
    labels: train.labels,
    numClasses: classes.length,
    options: { seed },
  });
  const trainMs = performance.now() - t0;
  const testXs = tf.tensor2d(test.rows);
  const probs = predictProbabilities(model, testXs);
  const correct = probs.filter((p, i) => p.indexOf(Math.max(...p)) === test.labels[i]).length;
  tf.dispose([xs, testXs]);
  model.dispose();
  return { accuracy: correct / test.labels.length, trainMs };
}

const summarise = (xs) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean, min: Math.min(...xs), max: Math.max(...xs) };
};
const pct = (x) => `${(x * 100).toFixed(1)}%`;

console.log(`Dataset: ${dataDir}`);
console.log(`Classes: ${classes.join(', ')}`);
console.log(`Train ${perClass}/class, held-out test ${testPerClass}/class, ${runs} runs`);
console.log(
  `Embedding: ${(embedMs / embedCount).toFixed(0)} ms/image (Node CPU backend; browsers with WebGL are much faster)`,
);

for (const feature of values.baseline ? ['embedding', 'pixels'] : ['embedding']) {
  const results = [];
  for (let r = 0; r < runs; r++) results.push(await evaluate(feature, r + 1));
  const acc = summarise(results.map((r) => r.accuracy));
  const ms = summarise(results.map((r) => r.trainMs));
  const name = feature === 'embedding' ? 'MobileNet embeddings' : 'Raw 32×32 pixels (baseline)';
  console.log(
    `${name}: test accuracy mean ${pct(acc.mean)} (min ${pct(acc.min)}, max ${pct(acc.max)}); head training ${(ms.mean / 1000).toFixed(1)} s`,
  );
}
extractor.dispose();
