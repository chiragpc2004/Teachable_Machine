import { describe, expect, it } from 'vitest';
import { stratifiedSplit, validateDataset } from '../dataset.js';

describe('validateDataset', () => {
  it('accepts two well-filled classes', () => {
    const r = validateDataset([
      { name: 'Cat', count: 25 },
      { name: 'Dog', count: 30 },
    ]);
    expect(r).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('requires at least two classes with samples', () => {
    const r = validateDataset([
      { name: 'Cat', count: 25 },
      { name: 'Dog', count: 0 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/at least 2 classes/);
  });

  it('blocks classes below the hard minimum', () => {
    const r = validateDataset([
      { name: 'Cat', count: 3 },
      { name: 'Dog', count: 30 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/"Cat" needs at least 5/);
  });

  it('warns (but allows) small and unbalanced classes', () => {
    const r = validateDataset([
      { name: 'Cat', count: 6 },
      { name: 'Dog', count: 40 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.includes('"Cat" has 6'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('unbalanced'))).toBe(true);
  });

  it('rejects empty and duplicate names', () => {
    expect(
      validateDataset([
        { name: ' ', count: 10 },
        { name: 'A', count: 10 },
      ]).errors.join(),
    ).toMatch(/needs a name/);
    expect(
      validateDataset([
        { name: 'A', count: 10 },
        { name: 'A ', count: 10 },
      ]).errors.join(),
    ).toMatch(/unique/);
  });
});

describe('stratifiedSplit', () => {
  const labels = [...Array(10).fill(0), ...Array(20).fill(1), ...Array(5).fill(2)];

  it('takes the same fraction from every class and loses no samples', () => {
    const { train, validation } = stratifiedSplit(labels, 0.2);
    expect([...train, ...validation].sort((a, b) => a - b)).toEqual(labels.map((_, i) => i));
    const valCounts = [0, 1, 2].map((c) => validation.filter((i) => labels[i] === c).length);
    expect(valCounts).toEqual([2, 4, 1]);
  });

  it('is deterministic for a seed', () => {
    expect(stratifiedSplit(labels, 0.2, 7)).toEqual(stratifiedSplit(labels, 0.2, 7));
  });

  it('keeps a training sample for tiny classes', () => {
    const { train, validation } = stratifiedSplit([0, 1, 1], 0.5);
    expect(train).toContain(0);
    expect(validation).not.toContain(0);
    expect(train.filter((i) => i > 0)).toHaveLength(1);
  });
});
