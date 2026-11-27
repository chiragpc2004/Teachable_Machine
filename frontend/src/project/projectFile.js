import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { FEATURE_EXTRACTOR_ID } from '../ml/config.js';

const FORMAT = 'teachable-project';
const VERSION = 1;

export function float32ToBase64(array) {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToFloat32(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/**
 * Project file = zip of project.json (names + embeddings) and small JPEG thumbnails.
 * We keep the embeddings so a re-imported project doesn't depend on the original photos.
 * @param {{ name: string, samples: { thumb: Blob, embedding: Float32Array }[] }[]} classes
 * @returns {Promise<Uint8Array>}
 */
export async function exportProjectFile(classes) {
  const files = {};
  const json = {
    format: FORMAT,
    version: VERSION,
    featureExtractor: FEATURE_EXTRACTOR_ID,
    createdAt: new Date().toISOString(),
    classes: [],
  };
  for (const [ci, cls] of classes.entries()) {
    const samples = [];
    for (const [si, s] of cls.samples.entries()) {
      const thumb = `thumbs/${ci}-${si}.jpg`;
      files[thumb] = new Uint8Array(await s.thumb.arrayBuffer());
      samples.push({ thumb, embedding: float32ToBase64(s.embedding) });
    }
    json.classes.push({ name: cls.name, samples });
  }
  files['project.json'] = strToU8(JSON.stringify(json));
  return zipSync(files, { level: 0 }); // JPEGs don't compress further
}

/** Limits for opening a project file: 10 classes × 300 images, plus project.json. */
export const MAX_PROJECT_ENTRIES = 3001;
export const MAX_PROJECT_BYTES = 200 * 1024 * 1024;

/**
 * @param {Uint8Array} bytes
 * @param {number} embeddingSize expected embedding length
 * @returns {{ name: string, samples: { thumb: Blob, embedding: Float32Array }[] }[]}
 */
export function importProjectFile(bytes, embeddingSize) {
  const notProject = "This file isn't a Teachable project.";
  let files;
  let tooBig = false;
  try {
    let count = 0;
    let total = 0;
    files = unzipSync(bytes, {
      // Zip-bomb guard: sizes come from the zip's directory, before anything is extracted.
      filter: (f) => {
        count++;
        total += f.originalSize;
        if (count > MAX_PROJECT_ENTRIES || total > MAX_PROJECT_BYTES) tooBig = true;
        return !tooBig;
      },
    });
  } catch {
    throw new Error(notProject);
  }
  if (tooBig) throw new Error('This project file is too large to open.');
  if (!files['project.json']) throw new Error(notProject);
  let json;
  try {
    json = JSON.parse(strFromU8(files['project.json']));
  } catch {
    throw new Error('This project file is damaged.');
  }
  if (json?.format !== FORMAT) throw new Error(notProject);
  if (json.version > VERSION) throw new Error('This project was made with a newer version of the app.');
  if (json.featureExtractor !== FEATURE_EXTRACTOR_ID) {
    throw new Error('This project was made with a different image model and can’t be opened.');
  }
  if (!Array.isArray(json.classes) || json.classes.some((c) => !Array.isArray(c?.samples)))
    throw new Error('This project file is damaged.');
  return json.classes.map((cls) => ({
    name: String(cls.name),
    samples: cls.samples.map((s) => {
      let embedding;
      try {
        embedding = base64ToFloat32(s.embedding);
      } catch {
        embedding = null;
      }
      if (embedding?.length !== embeddingSize || !files[s.thumb])
        throw new Error('This project file is damaged.');
      return { thumb: new Blob([files[s.thumb]], { type: 'image/jpeg' }), embedding };
    }),
  }));
}

/** True when a zip is a saved project (has a project.json at its root) rather than a dataset. */
export async function isProjectFile(file) {
  if (!/\.zip$/i.test(file.name)) return false;
  try {
    const found = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (f) => f.name === 'project.json',
    });
    return Boolean(found['project.json']);
  } catch {
    return false;
  }
}
