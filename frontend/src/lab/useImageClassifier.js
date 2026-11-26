import * as tf from '@tensorflow/tfjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MODEL_PATH,
  interpretPrediction,
  loadFeatureExtractor,
  pixelsToInput,
  predictProbabilities,
  trainClassifier,
} from '../ml/index.js';

const MODEL_URL = `${import.meta.env.BASE_URL}${MODEL_PATH}`;

/**
 * Owns all TensorFlow.js objects for the page so React components only ever
 * deal with plain data (arrays, strings, numbers). Tensors never leave this hook.
 */
export function useImageClassifier() {
  const extractorRef = useRef(null);
  const classifierRef = useRef(null);
  const [extractorStatus, setExtractorStatus] = useState({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await tf.ready();
        const extractor = await loadFeatureExtractor(MODEL_URL);
        if (cancelled) return extractor.dispose();
        extractorRef.current = extractor;
        setExtractorStatus({ state: 'ready', backend: tf.getBackend() });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setExtractorStatus({
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
      classifierRef.current?.model.dispose();
      classifierRef.current = null;
    };
  }, []);

  /** File → embedding (plain number[]). Throws a readable Error for unreadable files. */
  const embedFile = useCallback(async (file) => {
    const extractor = extractorRef.current;
    if (!extractor) throw new Error('The image model is still loading.');
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(`"${file.name}" isn't an image this browser can read.`);
    }
    try {
      return tf.tidy(() => Array.from(extractor.embed(pixelsToInput(bitmap)).dataSync()));
    } finally {
      bitmap.close();
    }
  }, []);

  /** @param {{ name: string, embeddings: number[][] }[]} classes */
  const train = useCallback(async (classes, onEpochEnd) => {
    const used = classes.filter((c) => c.embeddings.length > 0);
    const rows = used.flatMap((c) => c.embeddings);
    const labels = used.flatMap((c, i) => c.embeddings.map(() => i));
    const embeddings = tf.tensor2d(rows);
    try {
      const result = await trainClassifier({ embeddings, labels, numClasses: used.length, onEpochEnd });
      classifierRef.current?.model.dispose();
      classifierRef.current = { model: result.model, labels: used.map((c) => c.name) };
      return { validationAccuracy: result.validationAccuracy, trainAccuracy: result.trainAccuracy };
    } finally {
      embeddings.dispose();
    }
  }, []);

  const predictFile = useCallback(
    async (file, threshold) => {
      const classifier = classifierRef.current;
      if (!classifier) throw new Error('Train a model first.');
      const embedding = await embedFile(file);
      const probabilities = tf.tidy(
        () => predictProbabilities(classifier.model, tf.tensor2d([embedding]))[0],
      );
      return interpretPrediction(probabilities, classifier.labels, threshold);
    },
    [embedFile],
  );

  return { extractorStatus, embedFile, train, predictFile };
}
