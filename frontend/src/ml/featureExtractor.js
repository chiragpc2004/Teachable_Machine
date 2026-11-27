import * as tf from '@tensorflow/tfjs';
import { EMBEDDING_LAYER, IMAGE_SIZE } from './config.js';

/**
 * Loads MobileNet and cuts it at its last convolutional layer, adding global
 * average pooling, so it outputs a compact embedding (256 numbers for α=0.25)
 * describing the image. Our small classifier is trained on these embeddings —
 * this is transfer learning, the same idea Google's Teachable Machine uses.
 *
 * @param {string | tf.io.IOHandler} source URL of model.json, or an IOHandler (used in Node).
 */
export async function loadFeatureExtractor(source) {
  const mobilenet = await tf.loadLayersModel(source);
  const layer = mobilenet.getLayer(EMBEDDING_LAYER);
  const pooled = tf.layers.globalAveragePooling2d({}).apply(layer.output);
  const truncated = tf.model({ inputs: mobilenet.inputs, outputs: pooled });

  // Warm-up: the first call compiles GPU shaders; do it now rather than on the user's first click.
  tf.tidy(() => truncated.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])));

  const embeddingSize = truncated.outputs[0].shape[1];
  return {
    embeddingSize,
    /** The truncated MobileNet itself; used to build a self-contained model for export. */
    model: truncated,
    /** @param {tf.Tensor4D} input [n, 224, 224, 3] in [-1, 1]. Returns [n, embeddingSize]. */
    embed: (input) => tf.tidy(() => truncated.predict(input)),
    dispose: () => truncated.dispose(),
  };
}
