import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { base64ToFloat32, exportProjectFile, float32ToBase64, importProjectFile } from '../projectFile.js';

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
});
