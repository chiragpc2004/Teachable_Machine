import { unzip } from 'fflate';
import { groupByClass, isImagePath, isJunkPath, mimeForPath } from './imagePaths.js';

/** Zip-bomb / memory guards for imported datasets. */
export const MAX_DATASET_IMAGES = 3000;
export const MAX_DATASET_BYTES = 400 * 1024 * 1024;

const basename = (path) => path.split('/').pop();
const toFile = (path, data) => new File([data], basename(path), { type: mimeForPath(path) });

/**
 * Reads image entries out of a zip in a background worker (fflate).
 * @returns {Promise<{ path: string, file: File }[]>}
 */
export async function readZip(zipFile) {
  const bytes = new Uint8Array(await zipFile.arrayBuffer());
  let count = 0;
  let total = 0;
  let tooBig = false;
  const entries = await new Promise((resolve, reject) => {
    unzip(
      bytes,
      {
        filter: (f) => {
          if (isJunkPath(f.name) || !isImagePath(f.name)) return false;
          count++;
          total += f.originalSize;
          if (count > MAX_DATASET_IMAGES || total > MAX_DATASET_BYTES) {
            tooBig = true;
            return false;
          }
          return true;
        },
      },
      (err, files) =>
        err ? reject(new Error(`"${zipFile.name}" couldn't be opened as a zip file.`)) : resolve(files),
    );
  });
  if (tooBig) {
    throw new Error(
      `"${zipFile.name}" is too large. The limit is ${MAX_DATASET_IMAGES} images or ${MAX_DATASET_BYTES / 1024 / 1024} MB.`,
    );
  }
  return Object.entries(entries).map(([path, data]) => ({ path, file: toFile(path, data) }));
}

function readEntryFile(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readDirectory(dirEntry) {
  const reader = dirEntry.createReader();
  const all = [];
  // readEntries returns results in batches (100 in Chrome) until it returns an empty array.
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) return all;
    all.push(...batch);
  }
}

async function walk(entry, out) {
  if (isJunkPath(entry.name)) return;
  if (entry.isFile) {
    out.push({ path: entry.fullPath.replace(/^\//, ''), file: await readEntryFile(entry) });
  } else if (entry.isDirectory) {
    for (const child of await readDirectory(entry)) await walk(child, out);
  }
}

/**
 * Everything dropped (files, folders, zips), as relative paths + Files. Zips are NOT expanded
 * here, so callers can tell a saved project from a dataset; use expandZips for that.
 * Must be called synchronously inside the drop handler (DataTransfer is cleared afterwards).
 */
export function collectDropped(dataTransfer) {
  const entries = [...dataTransfer.items]
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);
  // Grab the plain file list now too: it's the fallback when entries are missing or unreadable
  // (older browsers, some synthetic drops). It has no folder structure, but the images still arrive.
  const plainFiles = [...dataTransfer.files].map((file) => ({ path: file.name, file }));
  return (async () => {
    const out = [];
    try {
      for (const entry of entries) await walk(entry, out);
    } catch (err) {
      console.warn('Reading dropped folders failed; using plain files', err);
      return plainFiles;
    }
    return out.length ? out : plainFiles;
  })();
}

/** From <input type="file" webkitdirectory> or a multi-file picker. */
export function collectFileList(fileList) {
  return expandZips([...fileList].map((file) => ({ path: file.webkitRelativePath || file.name, file })));
}

/**
 * Expands zips (entries are prefixed with the zip's name, so a zip groups like a folder of the
 * same name) and drops everything that isn't an image.
 */
export async function expandZips(items) {
  const out = [];
  for (const item of items) {
    if (/\.zip$/i.test(item.path)) {
      const prefix = item.path.replace(/\.zip$/i, '');
      for (const inner of await readZip(item.file))
        out.push({ path: `${prefix}/${inner.path}`, file: inner.file });
    } else if (isImagePath(item.path)) {
      out.push(item);
    }
  }
  if (out.length > MAX_DATASET_IMAGES)
    throw new Error(`That's more than ${MAX_DATASET_IMAGES} images at once.`);
  return out;
}

/**
 * Groups collected items into classes (one folder per class).
 * @returns {{ classes: { name: string, files: File[] }[], loose: number }}
 */
export function itemsToClasses(items) {
  const byPath = new Map(items.map((i) => [i.path, i.file]));
  const { classes, loose } = groupByClass([...byPath.keys()]);
  return { classes: classes.map((c) => ({ name: c.name, files: c.paths.map((p) => byPath.get(p)) })), loose };
}
