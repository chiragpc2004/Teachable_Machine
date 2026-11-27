import { describe, expect, it } from 'vitest';
import { groupByClass, isJunkPath, mimeForPath } from '../imagePaths.js';

const names = (r) => r.classes.map((c) => [c.name, c.paths.length]);

describe('groupByClass', () => {
  it('reads one folder per class at the root', () => {
    const r = groupByClass(['cat/1.jpg', 'cat/2.png', 'dog/1.jpeg']);
    expect(names(r)).toEqual([
      ['cat', 2],
      ['dog', 1],
    ]);
  });

  it('strips a wrapping folder (macOS/Windows "Compress folder")', () => {
    const r = groupByClass(['pets/', 'pets/cat/1.jpg', 'pets/dog/1.jpg', '__MACOSX/pets/._cat']);
    expect(names(r)).toEqual([
      ['cat', 1],
      ['dog', 1],
    ]);
  });

  it('strips several wrapping folders', () => {
    expect(names(groupByClass(['a/b/cat/1.jpg', 'a/b/dog/1.jpg']))).toEqual([
      ['cat', 1],
      ['dog', 1],
    ]);
  });

  it('keeps a single class folder as a class', () => {
    expect(names(groupByClass(['cat/1.jpg', 'cat/2.jpg']))).toEqual([['cat', 2]]);
  });

  it('flattens deeper sub-folders into the top-level class', () => {
    expect(names(groupByClass(['cat/indoor/1.jpg', 'cat/outdoor/2.jpg', 'dog/1.jpg']))).toEqual([
      ['cat', 2],
      ['dog', 1],
    ]);
  });

  it('counts loose images and skips junk and non-images', () => {
    const r = groupByClass(['photo.jpg', 'cat/1.jpg', 'cat/.DS_Store', 'cat/notes.txt', 'dog/1.jpg']);
    expect(r.loose).toBe(1);
    expect(r.skipped).toBe(2);
    expect(names(r)).toEqual([
      ['cat', 1],
      ['dog', 1],
    ]);
  });

  it('sorts class names naturally', () => {
    expect(groupByClass(['c10/1.jpg', 'c2/1.jpg']).classes.map((c) => c.name)).toEqual(['c2', 'c10']);
  });
});

describe('helpers', () => {
  it('detects junk', () => {
    expect(isJunkPath('__MACOSX/a/b.jpg')).toBe(true);
    expect(isJunkPath('a/.hidden/b.jpg')).toBe(true);
    expect(isJunkPath('a/b.jpg')).toBe(false);
  });
  it('maps extensions to MIME types', () => {
    expect(mimeForPath('a/B.JPG')).toBe('image/jpeg');
    expect(mimeForPath('a/b.webp')).toBe('image/webp');
  });
});
