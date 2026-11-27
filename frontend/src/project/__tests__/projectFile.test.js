import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { FEATURE_EXTRACTOR_ID } from '../../ml/config.js';
import {
  MAX_PROJECT_ENTRIES,
  base64ToFloat32,
  exportProjectFile,
  float32ToBase64,
  importProjectFile,
} from '../projectFile.js';

const emb = (seed) => Float32Array.from({ length: 256 }, (_, i) => Math.sin(seed + i));
const jpegBlob = (n) => new Blob([new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9])], { type: 'image/jpeg' });

describe('project file', () => {
  it('round-trips embeddings exactly', () => {
    const a = emb(1);
    expect(base64ToFloat32(float32ToBase64(a))).toEqual(a);
  });

  it('round-trips a project', async () => {
    const classes = [
      { name: 'Cat', samples: [{ thumb: jpegBlob(1), embedding: emb(1) }] },
      {
        name: 'Dog',
        samples: [
          { thumb: jpegBlob(2), embedding: emb(2) },
          { thumb: jpegBlob(3), embedding: emb(3) },
        ],
      },
    ];
    const bytes = await exportProjectFile(classes);
    const back = importProjectFile(bytes, 256);
    expect(back.map((c) => [c.name, c.samples.length])).toEqual([
      ['Cat', 1],
      ['Dog', 2],
    ]);
    expect(back[1].samples[1].embedding).toEqual(emb(3));
    expect(new Uint8Array(await back[1].samples[1].thumb.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 3, 0xff, 0xd9]),
    );
  });

  it('rejects files that are not projects', () => {
    expect(() => importProjectFile(new Uint8Array([1, 2, 3]), 256)).toThrow(/isn't a Teachable project/);
    const zip = zipSync({ 'project.json': strToU8('{"format":"other"}') });
    expect(() => importProjectFile(zip, 256)).toThrow(/isn't a Teachable project/);
  });

  it('rejects projects from a different image model', () => {
    const zip = zipSync({
      'project.json': strToU8(
        JSON.stringify({ format: 'teachable-project', version: 1, featureExtractor: 'x' }),
      ),
    });
    expect(() => importProjectFile(zip, 256)).toThrow(/different image model/);
  });

  const header = { format: 'teachable-project', version: 1, featureExtractor: FEATURE_EXTRACTOR_ID };

  it('reports damaged project files clearly instead of crashing', () => {
    const cases = [
      strToU8('{not json'),
      strToU8(JSON.stringify(header)), // no classes
      strToU8(JSON.stringify({ ...header, classes: [{ name: 'A' }] })), // no samples
      strToU8(
        JSON.stringify({ ...header, classes: [{ name: 'A', samples: [{ embedding: '!!', thumb: 'x' }] }] }),
      ),
    ];
    for (const json of cases) {
      expect(() => importProjectFile(zipSync({ 'project.json': json }), 256)).toThrow(/damaged/);
    }
  });

  it('refuses project files with too many entries (zip-bomb guard)', () => {
    const files = { 'project.json': strToU8(JSON.stringify({ ...header, classes: [] })) };
    for (let i = 0; i < MAX_PROJECT_ENTRIES; i++) files[`thumbs/${i}.jpg`] = new Uint8Array(1);
    expect(() => importProjectFile(zipSync(files), 256)).toThrow(/too large/);
  });
});
