import * as tf from './tf.js';
import { strToU8, zipSync } from 'fflate';
import { DEFAULT_CONFIDENCE_THRESHOLD, FEATURE_EXTRACTOR_ID, IMAGE_SIZE } from './config.js';

/**
 * One functional model: image → MobileNet → pooling → our head → probabilities.
 * Layers are shared with the live models (no weights are copied), so don't dispose it.
 */
export function buildCombinedModel(extractorModel, head) {
  let x = extractorModel.outputs[0];
  for (const layer of head.layers) x = layer.apply(x);
  return tf.model({ inputs: extractorModel.inputs, outputs: x, name: 'eyebright_classifier' });
}

async function captureArtifacts(model) {
  let artifacts;
  await model.save(
    tf.io.withSaveHandler(async (a) => {
      artifacts = a;
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }),
  );
  const weights = Array.isArray(artifacts.weightData)
    ? tf.io.concatenateArrayBuffers(artifacts.weightData)
    : artifacts.weightData;
  return { artifacts, weights: new Uint8Array(weights) };
}

const usageGuide = (labels) => `# Your Eyebright model

Classes: ${labels.map((l) => `"${l}"`).join(', ')}

Files:
- \`model.json\` + \`weights.bin\`: a TensorFlow.js layers model
- \`metadata.json\`: class labels and the preprocessing the model expects

## Use it in a web page

Serve these files from the same folder as your page (\`fetch\` doesn't work from \`file://\`), then:

\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4/dist/tf.min.js"></script>
<img id="photo" src="test.jpg" crossorigin="anonymous" />
<script type="module">
  const model = await tf.loadLayersModel('./model.json');
  const { labels } = await (await fetch('./metadata.json')).json();

  // Same preprocessing as in the app: centre-crop to a square, resize to ${IMAGE_SIZE}×${IMAGE_SIZE}, scale to [-1, 1].
  function preprocess(img) {
    return tf.tidy(() => {
      const pixels = tf.browser.fromPixels(img).toFloat().expandDims(0);
      const [h, w] = pixels.shape.slice(1, 3);
      const side = Math.min(h, w);
      const y = (h - side) / 2 / h, x = (w - side) / 2 / w;
      const box = [[y, x, y + side / h, x + side / w]];
      return tf.image.cropAndResize(pixels, box, [0], [${IMAGE_SIZE}, ${IMAGE_SIZE}]).div(127.5).sub(1);
    });
  }

  const img = document.getElementById('photo');
  await img.decode();
  const probabilities = await model.predict(preprocess(img)).data();
  const best = probabilities.indexOf(Math.max(...probabilities));
  console.log(labels[best], probabilities[best]);
</script>
\`\`\`

In the app, a result below ${Math.round(DEFAULT_CONFIDENCE_THRESHOLD * 100)}% confidence is shown as "Not sure". We recommend doing the same.
`;

/**
 * @returns {Promise<Uint8Array>} zip containing model.json, weights.bin, metadata.json, README.md
 */
export async function exportModelZip({
  extractorModel,
  head,
  labels,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
}) {
  const combined = buildCombinedModel(extractorModel, head);
  const { artifacts, weights } = await captureArtifacts(combined);
  const modelJson = {
    format: artifacts.format,
    generatedBy: artifacts.generatedBy,
    convertedBy: artifacts.convertedBy ?? null,
    modelTopology: artifacts.modelTopology,
    weightsManifest: [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }],
  };
  const metadata = {
    format: 'eyebright-model',
    version: 1,
    labels,
    featureExtractor: FEATURE_EXTRACTOR_ID,
    input: {
      shape: [1, IMAGE_SIZE, IMAGE_SIZE, 3],
      range: [-1, 1],
      preprocessing: `center-crop to square, resize to ${IMAGE_SIZE}x${IMAGE_SIZE} (bilinear), pixel / 127.5 - 1`,
    },
    confidenceThreshold: threshold,
    createdAt: new Date().toISOString(),
  };
  return zipSync({
    'model.json': strToU8(JSON.stringify(modelJson)),
    'weights.bin': [weights, { level: 0 }],
    'metadata.json': strToU8(JSON.stringify(metadata, null, 2)),
    'README.md': strToU8(usageGuide(labels)),
  });
}
