import * as tf from '@tensorflow/tfjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  MODEL_PATH,
  exportModelZip,
  interpretPrediction,
  loadFeatureExtractor,
  pixelsToInput,
  predictProbabilities,
  trainClassifier,
} from '../ml/index.js';
import { clearTrainedModel, loadTrainedModel, saveTrainedModel } from '../project/storage.js';
import { makeThumbnail } from '../project/thumbnail.js';

const MODEL_URL = `${import.meta.env.BASE_URL}${MODEL_PATH}`;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

function need(extractorRef) {
  if (!extractorRef.current) throw new Error('The image model is still loading.');
  return extractorRef.current;
}

/**
 * Owns every TensorFlow.js object (feature extractor + trained head). Components only
 * see plain data: Float32Array embeddings, Blobs, numbers and strings.
 */
export function useEngine() {
  const extractorRef = useRef(null);
  const headRef = useRef(null); // { model, labels }
  const [status, setStatus] = useState({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await tf.ready();
        const extractor = await loadFeatureExtractor(MODEL_URL);
        if (cancelled) return extractor.dispose();
        extractorRef.current = extractor;
        setStatus({ state: 'ready', backend: tf.getBackend() });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus({
            state: 'error',
            message: 'The image model could not be loaded. Check your connection and reload the page.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      extractorRef.current?.dispose();
      extractorRef.current = null;
      headRef.current?.model.dispose();
      headRef.current = null;
    };
  }, []);

  /** File → { embedding, thumb }. Throws a readable Error for unreadable or oversized files. */
  const processFile = useCallback(async (file, { thumbnail = true } = {}) => {
    const extractor = need(extractorRef);
    if (file.size > MAX_FILE_BYTES)
      throw new Error(`"${file.name}" is over ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(`"${file.name}" isn't an image this browser can read.`);
    }
    try {
      const embedding = tf.tidy(() => extractor.embed(pixelsToInput(bitmap)).dataSync().slice());
      const thumb = thumbnail ? await makeThumbnail(bitmap) : null;
      return { embedding, thumb };
    } finally {
      bitmap.close();
    }
  }, []);

  /** Processes files one by one, reporting progress; unreadable files are counted, not fatal. */
  const processFiles = useCallback(
    async (files, onProgress) => {
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
    [processFile],
  );

  /**
   * @param {{ name: string, embeddings: Float32Array[] }[]} classes only classes with samples
   * @param {number} revision project revision this model is trained on
   */
  const train = useCallback(async (classes, revision, onEpochEnd) => {
    const size = need(extractorRef).embeddingSize;
    const flat = new Float32Array(classes.reduce((n, c) => n + c.embeddings.length, 0) * size);
    const labels = [];
    let row = 0;
    classes.forEach((c, ci) =>
      c.embeddings.forEach((e) => {
        flat.set(e, row++ * size);
        labels.push(ci);
      }),
    );
    const embeddings = tf.tensor2d(flat, [labels.length, size]);
    try {
      const result = await trainClassifier({ embeddings, labels, numClasses: classes.length, onEpochEnd });
      headRef.current?.model.dispose();
      const names = classes.map((c) => c.name);
      headRef.current = { model: result.model, labels: names };
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
    }
  }, []);

  /** Restores a model saved in a previous visit. Returns its metadata, or null. */
  const restoreModel = useCallback(async () => {
    const saved = await loadTrainedModel();
    if (!saved) return null;
    headRef.current?.model.dispose();
    headRef.current = { model: saved.head, labels: saved.meta.labels };
    return saved.meta;
  }, []);

  const discardModel = useCallback(async () => {
    headRef.current?.model.dispose();
    headRef.current = null;
    await clearTrainedModel();
  }, []);

  const predictFile = useCallback(
    async (file, threshold = DEFAULT_CONFIDENCE_THRESHOLD) => {
      const head = headRef.current;
      if (!head) throw new Error('Train a model first.');
      const { embedding } = await processFile(file, { thumbnail: false });
      const probabilities = tf.tidy(
        () => predictProbabilities(head.model, tf.tensor2d(embedding, [1, embedding.length]))[0],
      );
      return interpretPrediction(probabilities, head.labels, threshold);
    },
    [processFile],
  );

  const exportModel = useCallback(async () => {
    const head = headRef.current;
    if (!head) throw new Error('Train a model first.');
    return exportModelZip({
      extractorModel: need(extractorRef).model,
      head: head.model,
      labels: head.labels,
    });
  }, []);

  const embeddingSize = () => need(extractorRef).embeddingSize;

  return { status, processFiles, train, restoreModel, discardModel, predictFile, exportModel, embeddingSize };
}
