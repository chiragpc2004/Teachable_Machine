import {
  MAX_IMBALANCE_RATIO,
  MIN_CLASSES,
  MIN_SAMPLES_PER_CLASS,
  RECOMMENDED_SAMPLES_PER_CLASS,
} from './config.js';

/**
 * Checks whether a set of classes can be trained, and what the user should improve.
 * @param {{ name: string, count: number }[]} classes
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateDataset(classes) {
  const errors = [];
  const warnings = [];

  const names = classes.map((c) => c.name.trim());
  if (names.some((n) => n === '')) errors.push('Every class needs a name.');
  const dupes = names.filter((n, i) => n !== '' && names.indexOf(n) !== i);
  if (dupes.length) errors.push(`Class names must be unique ("${dupes[0]}" is used twice).`);

  const filled = classes.filter((c) => c.count > 0);
  if (filled.length < MIN_CLASSES) {
    errors.push(`Add samples to at least ${MIN_CLASSES} classes.`);
  }
  for (const c of filled) {
    if (c.count < MIN_SAMPLES_PER_CLASS) {
      errors.push(`"${c.name}" needs at least ${MIN_SAMPLES_PER_CLASS} samples (has ${c.count}).`);
    } else if (c.count < RECOMMENDED_SAMPLES_PER_CLASS) {
      warnings.push(
        `"${c.name}" has ${c.count} samples; ${RECOMMENDED_SAMPLES_PER_CLASS}+ varied samples usually work better.`,
      );
    }
  }

  if (filled.length >= MIN_CLASSES) {
    const counts = filled.map((c) => c.count);
    const ratio = Math.max(...counts) / Math.min(...counts);
    if (ratio > MAX_IMBALANCE_RATIO) {
      warnings.push(
        'Classes are unbalanced; the model may favour the larger ones. Try adding samples to the smaller classes.',
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Small deterministic PRNG (mulberry32) so splits are reproducible. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Splits sample indices into train/validation, taking the same fraction from
 * every class (stratified) so small classes are always represented in both.
 * Each class keeps at least one training sample; classes with ≥2 samples
 * contribute at least one validation sample.
 * @param {number[]} labels class index per sample
 */
export function stratifiedSplit(labels, validationFraction, seed = 42) {
  const random = seededRandom(seed);
  const byClass = new Map();
  labels.forEach((label, i) => {
    if (!byClass.has(label)) byClass.set(label, []);
    byClass.get(label).push(i);
  });

  const train = [];
  const validation = [];
  for (const indices of byClass.values()) {
    const shuffled = [...indices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const nVal =
      shuffled.length < 2
        ? 0
        : Math.min(shuffled.length - 1, Math.max(1, Math.round(shuffled.length * validationFraction)));
    validation.push(...shuffled.slice(0, nVal));
    train.push(...shuffled.slice(nVal));
  }
  return { train: train.sort((a, b) => a - b), validation: validation.sort((a, b) => a - b) };
}
