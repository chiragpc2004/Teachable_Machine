const BASE = `${import.meta.env.BASE_URL}samples/flowers/`;

async function fetchFile(rel) {
  const res = await fetch(BASE + rel);
  if (!res.ok) throw new Error(`Couldn't download the sample images (${res.status}).`);
  return new File([await res.blob()], rel.split('/').pop(), { type: 'image/jpeg' });
}

export const SAMPLE_CREDITS_URL = `${BASE}ATTRIBUTION.md`;

/** @returns {Promise<{ classes: { name: string, files: File[] }[], testFiles: () => Promise<File[]> }>} */
export async function loadSampleProject() {
  const res = await fetch(`${BASE}manifest.json`);
  if (!res.ok) throw new Error(`Couldn't download the sample project (${res.status}).`);
  const manifest = await res.json();
  const classes = [];
  for (const cls of manifest.classes) {
    classes.push({ name: cls.name, files: await Promise.all(cls.images.map(fetchFile)) });
  }
  return { classes };
}

export async function loadSampleTestImages() {
  const manifest = await (await fetch(`${BASE}manifest.json`)).json();
  return Promise.all(manifest.test.map(fetchFile));
}
