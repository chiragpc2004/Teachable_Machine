// Downloads the MobileNet v1 (alpha 0.25, 224px) TF.js weights into public/models/
// so the app serves them itself instead of depending on a third-party CDN at runtime.
// Usage: node scripts/fetch-model.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_NAME = 'mobilenet_v1_0.25_224';
const BASE_URL = `https://storage.googleapis.com/tfjs-models/tfjs/${MODEL_NAME}/`;
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models', MODEL_NAME);

async function download(name) {
  const res = await fetch(BASE_URL + name);
  if (!res.ok) throw new Error(`GET ${name} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(outDir, { recursive: true });
const manifestBytes = await download('model.json');
await writeFile(join(outDir, 'model.json'), manifestBytes);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const shards = manifest.weightsManifest.flatMap((group) => group.paths);

let total = manifestBytes.length;
for (const shard of shards) {
  const bytes = await download(shard);
  await writeFile(join(outDir, shard), bytes);
  total += bytes.length;
}
console.log(`Saved ${shards.length + 1} files (${(total / 1e6).toFixed(2)} MB) to ${outDir}`);
