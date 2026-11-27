import { DEFAULT_CONFIDENCE_THRESHOLD } from './config.js';

/**
 * Turns raw probabilities into something a person can act on. We never present a
 * low-confidence guess as an answer: below the threshold the result is "uncertain".
 * @param {number[]} probabilities one per class, summing to ~1
 * @param {string[]} labels class names in the same order
 */
export function interpretPrediction(probabilities, labels, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  if (probabilities.length !== labels.length) {
    throw new Error(`Got ${probabilities.length} probabilities for ${labels.length} labels.`);
  }
  const ranked = labels
    .map((label, i) => ({ label, probability: probabilities[i] }))
    .sort((a, b) => b.probability - a.probability);
  const top = ranked[0];
  const uncertain = top.probability < threshold;
  return {
    label: uncertain ? null : top.label,
    confidence: top.probability,
    uncertain,
    ranked,
  };
}
