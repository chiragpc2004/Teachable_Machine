import * as tf from '@tensorflow/tfjs';
import { del, get, set } from 'idb-keyval';
import { FEATURE_EXTRACTOR_ID } from '../ml/config.js';

const PROJECT_KEY = 'teachable:project:v1';
const MODEL_META_KEY = 'teachable:model-meta:v1';
const HEAD_URL = 'indexeddb://teachable-head-v1';

// Thumbnails are stored as raw bytes, not Blobs: some WebKit builds reject Blobs in
// IndexedDB. Bytes are cached per Blob so auto-save doesn't re-read unchanged thumbnails.
const bytesCache = new WeakMap();
async function blobBytes(blob) {
  if (!bytesCache.has(blob)) bytesCache.set(blob, blob.arrayBuffer());
  return bytesCache.get(blob);
}

/** Saves the whole project (thumbnails as bytes, embeddings as Float32Arrays). */
export async function saveProject(project) {
  const classes = await Promise.all(
    project.classes.map(async (c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      samples: await Promise.all(
        c.samples.map(async (s) => ({
          id: s.id,
          embedding: s.embedding,
          thumb: { bytes: await blobBytes(s.thumb), type: s.thumb.type || 'image/jpeg' },
        })),
      ),
    })),
  );
  await set(PROJECT_KEY, {
    featureExtractor: FEATURE_EXTRACTOR_ID,
    revision: project.revision,
    source: project.source,
    classes,
  });
}

/** @returns {Promise<object | null>} null when nothing is saved or it's from an incompatible model. */
export async function loadProject() {
  const saved = await get(PROJECT_KEY);
  if (!saved || saved.featureExtractor !== FEATURE_EXTRACTOR_ID || !Array.isArray(saved.classes)) return null;
  return {
    ...saved,
    classes: saved.classes.map((c) => ({
      ...c,
      samples: c.samples.map((s) => {
        const thumb = new Blob([s.thumb.bytes], { type: s.thumb.type });
        bytesCache.set(thumb, Promise.resolve(s.thumb.bytes));
        return { ...s, thumb };
      }),
    })),
  };
}

export async function saveTrainedModel(head, meta) {
  await head.save(HEAD_URL);
  await set(MODEL_META_KEY, meta);
}

/** @returns {Promise<{ head: tf.LayersModel, meta: object } | null>} */
export async function loadTrainedModel() {
  const meta = await get(MODEL_META_KEY);
  if (!meta) return null;
  try {
    return { head: await tf.loadLayersModel(HEAD_URL), meta };
  } catch {
    return null;
  }
}

export async function clearTrainedModel() {
  await del(MODEL_META_KEY);
  await tf.io.removeModel(HEAD_URL).catch(() => {});
}

export async function clearAll() {
  await del(PROJECT_KEY);
  await clearTrainedModel();
}
