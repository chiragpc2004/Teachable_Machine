/**
 * The only place the app imports TensorFlow.js from, so it's easy to see what depends on it.
 * App code loads it lazily (see app/useEngine.js), so it isn't part of the first download.
 *
 * We use the all-in-one package: importing the smaller sub-packages saved nothing measurable
 * (the build already drops unused code) and, in Node, loaded two copies of the engine.
 */
export * from '@tensorflow/tfjs';
