// Lets TF.js load a layers model from local files in Node (no tfjs-node native build needed).
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export function fsModelHandler(modelJsonPath) {
  return {
    async load() {
      const manifest = JSON.parse(await readFile(modelJsonPath, 'utf8'));
      const dir = dirname(modelJsonPath);
      const weightSpecs = manifest.weightsManifest.flatMap((g) => g.weights);
      const buffers = [];
      for (const path of manifest.weightsManifest.flatMap((g) => g.paths)) {
        buffers.push(await readFile(join(dir, path)));
      }
      const all = Buffer.concat(buffers);
      return {
        modelTopology: manifest.modelTopology,
        weightSpecs,
        weightData: all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength),
      };
    },
  };
}
