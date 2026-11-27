import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  exportModelZip,
  interpretPrediction,
  loadFeatureExtractor,
  pixelsToInput,
  predictProbabilities,
  trainClassifier,
} from '../ml/index.js';
import * as tf from '../ml/tf.js';
import { clearTrainedModel, loadTrainedModel, saveTrainedModel } from '../project/storage.js';
import { makeThumbnail } from '../project/thumbnail.js';

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
/**
 * Big photos are shrunk (short side to this many pixels) by the browser's high-quality scaler
 * before they reach TensorFlow.js. A 12–48 MP phone photo would otherwise be uploaded to the GPU
 * at full size (slow, and it can exceed a phone's texture limit), and resizing straight from
 * thousands of pixels to 224 with bilinear sampling skips most of the image's detail.
 */
export const DECODE_SHORT_SIDE = 448;

async function decode(file) {
  const full = await createImageBitmap(file);
  const short = Math.min(full.width, full.height);
  if (short <= DECODE_SHORT_SIDE) return full;
  const scale = DECODE_SHORT_SIDE / short;
  try {
    const small = await createImageBitmap(full, {
      resizeWidth: Math.round(full.width * scale),
      resizeHeight: Math.round(full.height * scale),
      resizeQuality: 'high',
    });
    full.close();
    return small;
  } catch {
    return full; // resize options unsupported: use the full-size image
  }
}

/**
 * Owns every TensorFlow.js object (feature extractor + trained head). This module, and
 * TensorFlow.js with it, is loaded lazily by useEngine, so the page renders before the
 * ~300 KB of ML code arrives. Callers only see plain data: Float32Array embeddings, Blobs,
 * numbers and strings.
 */
export async function createEngine(modelUrl) {
  await tf.ready();
  const extractor = await loadFeatureExtractor(modelUrl);
  let head = null; // { model, labels }

  async function processFile(file, { thumbnail = true } = {}) {
    if (file.size > MAX_FILE_BYTES)
      throw new Error(`"${file.name}" is over ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
    let bitmap;
    try {
      bitmap = await decode(file);
    } catch {
      throw new Error(`"${file.name}" isn't an image this browser can read.`);
    }
    try {
      // data() waits for the GPU without blocking the page, unlike dataSync().
      const output = tf.tidy(() => extractor.embed(pixelsToInput(bitmap)));
      let embedding;
      try {
        embedding = new Float32Array(await output.data());
      } finally {
        output.dispose();
      }
      const thumb = thumbnail ? await makeThumbnail(bitmap) : null;
      return { embedding, thumb };
    } finally {
      bitmap.close();
    }
  }

  function replaceHead(next) {
    head?.model.dispose();
    head = next;
  }

  return {
    backend: tf.getBackend(),
    embeddingSize: extractor.embeddingSize,

    /** Processes files one by one, reporting progress; unreadable files are counted, not fatal. */
    async processFiles(files, onProgress) {
      const samples = [];
      const failures = [];
      for (const [i, file] of files.entries()) {
        try {
          samples.push(await processFile(file));
        } catch (err) {
          failures.push(err.message);
        }
        onProgress?.(i + 1, files.length);
        if (i % 8 === 7) await new Promise((r) => setTimeout(r)); // let the UI paint
      }
      return { samples, failures };
    },

    /**
     * @param {{ name: string, embeddings: Float32Array[] }[]} classes only classes with samples
     * @param {number} revision project revision this model is trained on
     */
    async train(classes, revision, onEpochEnd) {
      const size = extractor.embeddingSize;
      const flat = new Float32Array(classes.reduce((n, c) => n + c.embeddings.length, 0) * size);
      const labels = [];
      let row = 0;
      classes.forEach((c, ci) =>
        c.embeddings.forEach((e) => {
          flat.set(e, row++ * size);
          labels.push(ci);
        }),
      );
      // The classifier is tiny (~17k weights), so the CPU trains it faster than the GPU: each GPU
      // step has a fixed overhead larger than the maths itself. The trained weights move to the
      // GPU on their own the first time the model is used there.
      const gpuBackend = tf.getBackend();
      if (gpuBackend !== 'cpu') await tf.setBackend('cpu');
      const embeddings = tf.tensor2d(flat, [labels.length, size]);
      try {
        const result = await trainClassifier({ embeddings, labels, numClasses: classes.length, onEpochEnd });
        const names = classes.map((c) => c.name);
        replaceHead({ model: result.model, labels: names });
        const meta = {
          labels: names,
          revision,
          validationAccuracy: result.validationAccuracy,
          validationSize: result.validationSize,
          trainedAt: new Date().toISOString(),
        };
        saveTrainedModel(result.model, meta).catch((err) => console.warn('Could not save model', err));
        return meta;
      } finally {
        embeddings.dispose();
        if (gpuBackend !== 'cpu') await tf.setBackend(gpuBackend);
      }
    },

    /** Restores a model saved in a previous visit. Returns its metadata, or null. */
    async restoreModel() {
      const saved = await loadTrainedModel();
      if (!saved) return null;
      replaceHead({ model: saved.head, labels: saved.meta.labels });
      return saved.meta;
    },

    async discardModel() {
      replaceHead(null);
      await clearTrainedModel();
    },

    async predictFile(file, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
      if (!head) throw new Error('Train a model first.');
      const { model, labels } = head;
      const { embedding } = await processFile(file, { thumbnail: false });
      const probabilities = tf.tidy(
        () => predictProbabilities(model, tf.tensor2d(embedding, [1, embedding.length]))[0],
      );
      return interpretPrediction(probabilities, labels, threshold);
    },

    async exportModel() {
      if (!head) throw new Error('Train a model first.');
      return exportModelZip({ extractorModel: extractor.model, head: head.model, labels: head.labels });
    },

    dispose() {
      replaceHead(null);
      extractor.dispose();
    },
  };
}
