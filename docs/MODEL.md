# Model

How Teachable turns your images into a classifier, and how well that works.

## Pipeline

```
image ──► centre-crop to square ──► resize 224×224 ──► scale to [-1, 1]
      ──► MobileNet v1 (α=0.25), cut at conv_pw_13_relu + global average pooling
      ──► 256-number embedding ──► small trainable head ──► probability per class
```

- **Feature extractor (frozen):** MobileNet v1, width multiplier 0.25, 224 px input, pretrained on ImageNet. The weights are 1.96 MB and self-hosted in `frontend/public/models/` (see `npm run fetch-model`), so the app has no runtime dependency on a third-party CDN.
- **Classifier head (trained in the browser):** Dense(64, ReLU) → Dropout(0.3) → Dense(classes, softmax), Adam (lr 0.001), 30 epochs, batch 16.
- **Why transfer learning:** MobileNet already "knows" edges, textures and shapes from millions of photos. We only train a tiny head on its output, so a few dozen images per class are enough and training takes about a second. Google's Teachable Machine uses the same idea.
- **Validation:** 20% of each class (stratified) is held back during training, and the accuracy on it is shown after training.
- **Uncertainty:** if the top class is below 60% probability, the app says "Not sure" instead of giving an answer (`DEFAULT_CONFIDENCE_THRESHOLD` in `src/ml/config.js`).
- **Dataset rules:** training needs ≥ 2 classes with ≥ 5 samples each. The app warns below 20 samples per class or when one class has more than 3× the samples of another.

All of this lives in `frontend/src/ml/`. Training and inference share one `preprocess.js`, so they can't drift apart.

## Measured accuracy

Measured with `npm run validate-model -- <dir> ...` on TensorFlow's public [flower_photos](https://www.tensorflow.org/datasets/catalog/tf_flowers) dataset. Each run trains on 30 images per class and scores on 50 **different** images per class that the model never saw. The script runs the same `src/ml` code as the app (Node, TF.js CPU backend).

| Task | Runs | Held-out test accuracy (mean, min–max) |
|---|---|---|
| 3 classes: daisy, roses, sunflowers | 5 | **86.8%** (85.3–90.7%) |
| Same, raw 32×32 pixels instead of embeddings (baseline, roughly the old backend's approach) | 5 | 58.5% (53.3–65.3%) |
| 5 classes: adds dandelion, tulips | 3 | **80.4%** (80.0–80.8%) |

Measured 2026-11-27, @tensorflow/tfjs 4.22.

**Reading these numbers:** flowers are a fairly hard test. The photos are cluttered, and roses and tulips look alike. Typical Teachable-style tasks (your own objects or gestures on a consistent background, from a webcam) are usually easier. Accuracy depends mostly on how varied and representative your samples are.

**Timing:** embedding took about 90 ms per image on the Node CPU backend (Apple Silicon), and head training took about 1–1.5 s. Browsers use WebGL and are faster; this hasn't been benchmarked yet (Phase 8).

## Browser verification

`npm run test:e2e` runs the full journey (load model → add samples → train → predict) against the production build in headless Chromium and WebKit (Safari's engine). All passed on 2026-11-27. Real-device checks (iOS Safari, Android Chrome) are scheduled for Phase 7.

## Known limitations

- Images are classified as a whole. The model doesn't locate objects, and a small object in a busy scene is hard to recognise.
- There's no "none of these" class unless you train one. An unrelated image will still get a probability spread over your classes. The "Not sure" threshold helps, but it isn't a guarantee.
- It learns whatever differs between your classes, including background and lighting. If all "cat" photos are indoors and all "dog" photos are outdoors, it may learn indoor vs outdoor.
- MobileNet α=0.25 trades some accuracy for size and speed. A larger variant could be offered later.
