import * as tf from '../tf.js';
import { strFromU8, unzipSync } from 'fflate';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fsModelHandler } from '../../../scripts/lib/fsModelHandler.mjs';
import { trainClassifier } from '../classifier.js';
import { MODEL_PATH } from '../config.js';
import { exportModelZip } from '../exportModel.js';
import { loadFeatureExtractor } from '../featureExtractor.js';
import { imageTensorToInput } from '../preprocess.js';

const modelJson = fileURLToPath(new URL(`../../../public/${MODEL_PATH}`, import.meta.url));

describe('exportModelZip', () => {
  let extractor;
  let head;
  beforeAll(async () => {
    extractor = await loadFeatureExtractor(fsModelHandler(modelJson));
    const embeddings = tf.tidy(() =>
      tf.concat([tf.randomUniform([10, 256], 0, 1), tf.randomUniform([10, 256], 2, 3)]),
    );
    ({ model: head } = await trainClassifier({
      embeddings,
      labels: [...Array(10).fill(0), ...Array(10).fill(1)],
      numClasses: 2,
      options: { epochs: 3 },
    }));
    embeddings.dispose();
  }, 60_000);
  afterAll(() => {
    head?.dispose();
    extractor?.dispose();
  });

  it('produces a self-contained model that matches the in-app pipeline', async () => {
    const zip = unzipSync(
      await exportModelZip({ extractorModel: extractor.model, head, labels: ['A', 'B'] }),
    );
    expect(Object.keys(zip).sort()).toEqual(['README.md', 'metadata.json', 'model.json', 'weights.bin']);

    const metadata = JSON.parse(strFromU8(zip['metadata.json']));
    expect(metadata.labels).toEqual(['A', 'B']);
    const manifest = JSON.parse(strFromU8(zip['model.json']));
    expect(manifest.weightsManifest[0].paths).toEqual(['weights.bin']);

    const w = zip['weights.bin'];
    const loaded = await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: manifest.modelTopology,
        weightSpecs: manifest.weightsManifest[0].weights,
        weightData: w.buffer.slice(w.byteOffset, w.byteOffset + w.byteLength),
      }),
    );

    const input = tf.tidy(() => imageTensorToInput(tf.randomUniform([200, 300, 3], 0, 255)));
    const viaApp = tf.tidy(() => head.predict(extractor.embed(input)).dataSync());
    const viaExport = tf.tidy(() => loaded.predict(input).dataSync());
    expect(Array.from(viaExport).map((x) => x.toFixed(4))).toEqual(
      Array.from(viaApp).map((x) => x.toFixed(4)),
    );

    // The live models must still work after export (layers are shared, not consumed).
    expect(tf.tidy(() => head.predict(extractor.embed(input)).shape)).toEqual([1, 2]);
    loaded.dispose();
    input.dispose();
  });
});
