// Builds the bundled sample project from TensorFlow's flower_photos dataset (CC-BY 2.0).
// Picks a spread of images per class, shrinks them, and writes a manifest plus per-image
// photographer credits (required by the licence).
//
// Usage: node scripts/build-sample.mjs <path-to/flower_photos>
import * as tf from '../src/ml/tf.js';
import jpeg from 'jpeg-js';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLASSES = ['daisy', 'roses', 'sunflowers'];
const TRAIN_PER_CLASS = 20;
const TEST_PER_CLASS = 3;
const MAX_SIDE = 320;

const [srcDir] = process.argv.slice(2);
if (!srcDir) {
  console.error('Usage: node scripts/build-sample.mjs <path-to/flower_photos>');
  process.exit(1);
}
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples', 'flowers');

// "daisy/123_n.jpg CC-BY by Name - https://flickr..." → { file, credit, url }
const credits = new Map();
for (const line of (await readFile(join(srcDir, 'LICENSE.txt'), 'utf8')).split('\n')) {
  const m = line.match(/^(\S+\.jpg) CC-BY by (.+) - (https?:\/\/\S+)$/);
  if (m) credits.set(m[1], { author: m[2].trim(), url: m[3] });
}

function shrink(bytes) {
  const { width, height, data } = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false });
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const [w, h] = [Math.round(width * scale), Math.round(height * scale)];
  const rgb = tf.tidy(() =>
    tf.image
      .resizeBilinear(tf.tensor3d(data, [height, width, 3], 'int32').toFloat(), [h, w])
      .round()
      .clipByValue(0, 255)
      .dataSync(),
  );
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = rgb[i * 3];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return jpeg.encode({ data: rgba, width: w, height: h }, 80).data;
}

await rm(outDir, { recursive: true, force: true });
const manifest = { name: 'Flowers', classes: [], test: [] };
const attribution = [];
let bytesTotal = 0;

for (const cls of CLASSES) {
  // Spread picks across the (sorted) credited files rather than taking the first N.
  const files = [...credits.keys()].filter((f) => f.startsWith(`${cls}/`)).sort();
  const need = TRAIN_PER_CLASS + TEST_PER_CLASS;
  const step = Math.floor(files.length / need);
  const picked = Array.from({ length: need }, (_, i) => files[i * step]);

  await mkdir(join(outDir, cls), { recursive: true });
  await mkdir(join(outDir, 'test'), { recursive: true });
  const entry = { name: cls[0].toUpperCase() + cls.slice(1), images: [] };
  for (const [i, src] of picked.entries()) {
    const isTest = i >= TRAIN_PER_CLASS;
    const rel = isTest ? `test/${cls}-${i - TRAIN_PER_CLASS + 1}.jpg` : `${cls}/${i + 1}.jpg`;
    const out = shrink(await readFile(join(srcDir, src)));
    await writeFile(join(outDir, rel), out);
    bytesTotal += out.length;
    (isTest ? manifest.test : entry.images).push(rel);
    const c = credits.get(src);
    attribution.push(`| \`${rel}\` | ${c.author.replace(/\|/g, '\\|')} | [source](${c.url}) |`);
  }
  manifest.classes.push(entry);
}

await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(
  join(outDir, 'ATTRIBUTION.md'),
  `# Sample photo credits

The sample project's photos come from TensorFlow's [flower_photos](https://www.tensorflow.org/datasets/catalog/tf_flowers) dataset.
Each photo is licensed under [Creative Commons Attribution 2.0](https://creativecommons.org/licenses/by/2.0/) by the photographer listed below.
The images have been resized (max ${MAX_SIDE}px) and re-encoded as JPEG. No other changes were made.

| File | Photographer | Original |
|---|---|---|
${attribution.join('\n')}
`,
);
console.log(`Wrote ${attribution.length} images (${(bytesTotal / 1e6).toFixed(2)} MB) to ${outDir}`);
