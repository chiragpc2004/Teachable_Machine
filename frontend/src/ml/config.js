// Central ML settings. Training and inference both read from here so they can't drift apart.

/** Side length (px) of the square image MobileNet expects. */
export const IMAGE_SIZE = 224;

/** Last convolutional layer of MobileNet v1; everything after it is ImageNet-specific. */
export const EMBEDDING_LAYER = 'conv_pw_13_relu';

/** Self-hosted weights (downloaded by scripts/fetch-model.mjs). */
export const MODEL_PATH = 'models/mobilenet_v1_0.25_224/model.json';

/** Below this top-1 probability we tell the user "Not sure" instead of a label. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

/** Hard minimums: training is blocked below these. */
export const MIN_CLASSES = 2;
export const MIN_SAMPLES_PER_CLASS = 5;

/** Soft guidance: we warn (but allow training) below this. */
export const RECOMMENDED_SAMPLES_PER_CLASS = 20;

/** Warn when the largest class has more than this many times the samples of the smallest. */
export const MAX_IMBALANCE_RATIO = 3;

export const TRAINING_DEFAULTS = {
  epochs: 30,
  batchSize: 16,
  learningRate: 0.001,
  hiddenUnits: 64,
  dropout: 0.3,
  validationFraction: 0.2,
};
