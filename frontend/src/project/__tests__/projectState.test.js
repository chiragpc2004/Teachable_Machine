import { describe, expect, it } from 'vitest';
import { MAX_CLASSES, initialProject, projectReducer } from '../projectState.js';

const sample = (id) => ({ id, thumb: null, embedding: new Float32Array(2) });

describe('projectReducer', () => {
  it('starts with two empty classes', () => {
    const s = initialProject();
    expect(s.classes.map((c) => c.name)).toEqual(['Class 1', 'Class 2']);
    expect(s.revision).toBe(0);
  });

  it('bumps the revision on every change', () => {
    let s = initialProject();
    const id = s.classes[0].id;
    s = projectReducer(s, { type: 'renameClass', id, name: 'Cat' });
    s = projectReducer(s, { type: 'addSamples', id, samples: [sample('a'), sample('b')] });
    s = projectReducer(s, { type: 'removeSample', id, sampleId: 'a' });
    expect(s.revision).toBe(3);
    expect(s.classes[0]).toMatchObject({ name: 'Cat', samples: [{ id: 'b' }] });
  });

  it('caps the number of classes and picks unused default names', () => {
    let s = initialProject();
    s = projectReducer(s, { type: 'removeClass', id: s.classes[0].id }); // leaves "Class 2"
    s = projectReducer(s, { type: 'addClass' });
    expect(s.classes.map((c) => c.name)).toEqual(['Class 2', 'Class 3']);
    for (let i = 0; i < 20; i++) s = projectReducer(s, { type: 'addClass' });
    expect(s.classes).toHaveLength(MAX_CLASSES);
  });

  it('imports into a fresh project without leaving empty default classes', () => {
    const s = projectReducer(initialProject(), {
      type: 'importClasses',
      classes: [
        { name: 'daisy', samples: [sample('1')] },
        { name: 'roses', samples: [sample('2')] },
      ],
      source: 'sample',
    });
    expect(s.classes.map((c) => c.name)).toEqual(['daisy', 'roses']);
    expect(s.source).toBe('sample');
  });

  it('merges imported classes by name', () => {
    let s = projectReducer(initialProject(), {
      type: 'importClasses',
      classes: [
        { name: 'cat', samples: [sample('1')] },
        { name: 'dog', samples: [sample('2')] },
      ],
    });
    s = projectReducer(s, { type: 'importClasses', classes: [{ name: 'cat', samples: [sample('3')] }] });
    expect(s.classes.find((c) => c.name === 'cat').samples).toHaveLength(2);
    expect(s.classes).toHaveLength(2);
  });

  it('pads to two classes when an import has only one', () => {
    const s = projectReducer(initialProject(), {
      type: 'importClasses',
      replace: true,
      classes: [{ name: 'cat', samples: [sample('1')] }],
    });
    expect(s.classes.map((c) => c.name)).toEqual(['cat', 'Class 2']);
  });

  it('gives each class a stable colour that survives deleting others', () => {
    let s = initialProject();
    s = projectReducer(s, { type: 'addClass' });
    expect(s.classes.map((c) => c.color)).toEqual([0, 1, 2]);
    s = projectReducer(s, { type: 'removeClass', id: s.classes[0].id });
    expect(s.classes.map((c) => c.color)).toEqual([1, 2]);
    s = projectReducer(s, { type: 'addClass' });
    expect(s.classes.map((c) => c.color)).toEqual([1, 2, 0]); // reuses the freed colour
  });

  it('assigns colours to projects saved without them', () => {
    const s = projectReducer(initialProject(), {
      type: 'load',
      project: {
        revision: 5,
        classes: [
          { id: 'a', name: 'A', samples: [] },
          { id: 'b', name: 'B', samples: [] },
        ],
      },
    });
    expect(s.classes.map((c) => c.color)).toEqual([0, 1]);
  });

  it('truncates long names', () => {
    const s = initialProject();
    const r = projectReducer(s, { type: 'renameClass', id: s.classes[0].id, name: 'x'.repeat(100) });
    expect(r.classes[0].name).toHaveLength(40);
  });
});
