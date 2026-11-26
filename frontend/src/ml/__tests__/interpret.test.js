import { describe, expect, it } from 'vitest';
import { interpretPrediction } from '../interpret.js';

describe('interpretPrediction', () => {
  it('returns the top label when confident', () => {
    const r = interpretPrediction([0.1, 0.85, 0.05], ['a', 'b', 'c']);
    expect(r.label).toBe('b');
    expect(r.uncertain).toBe(false);
    expect(r.ranked.map((x) => x.label)).toEqual(['b', 'a', 'c']);
  });

  it('refuses to answer below the threshold', () => {
    const r = interpretPrediction([0.45, 0.55], ['a', 'b']);
    expect(r).toMatchObject({ label: null, uncertain: true, confidence: 0.55 });
  });

  it('respects a custom threshold', () => {
    expect(interpretPrediction([0.45, 0.55], ['a', 'b'], 0.5).label).toBe('b');
  });

  it('throws on mismatched lengths', () => {
    expect(() => interpretPrediction([1], ['a', 'b'])).toThrow();
  });
});
