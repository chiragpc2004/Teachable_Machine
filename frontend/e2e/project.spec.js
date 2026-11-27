import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
import { datasetZip, images } from './fixtures.js';
import { addImages, classCard, openApp, testInput, trainModel } from './helpers.js';

test.beforeEach(({ page }) => openApp(page));

const zipInput = (page) => page.locator('.import input[accept*=".zip"]');

test('sample project: load, train, and classify held-out flowers', async ({ page }) => {
  await page.getByRole('button', { name: /Try the sample project/ }).click();
  await expect(page.getByText(/Sample project loaded/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel('Class name')).toHaveCount(3);
  for (const n of [0, 1, 2]) await expect(classCard(page, n).locator('.count')).toHaveText('20 samples');

  await trainModel(page);
  await page.getByRole('button', { name: 'Try sample test images' }).click();
  const results = page.locator('.result');
  await expect(results).toHaveCount(9, { timeout: 30_000 });

  // Each test file is named after its true class (e.g. "daisy-2.jpg").
  // This is a sanity check of the pipeline, not an accuracy benchmark (9 images is far too few;
  // see scripts/validate-model.mjs). Two test photos are deliberately hard (a tinted daisy
  // close-up, a whole rose bush) and usually come back "Not sure", which is the right behaviour.
  let correct = 0;
  let confidentlyWrong = 0;
  const misses = [];
  for (const r of await results.all()) {
    const file = await r.locator('img').getAttribute('alt');
    const headline = (await r.locator('.result__headline').textContent()).toLowerCase();
    const unsure = headline.startsWith('not sure');
    if (!unsure && headline.startsWith(file.split('-')[0])) correct++;
    else {
      if (!unsure) confidentlyWrong++;
      misses.push(`${file} → ${headline}`);
    }
  }
  console.log(`[sample] ${correct}/9 correct. Misses: ${misses.join('; ') || 'none'}`);
  expect(correct).toBeGreaterThanOrEqual(5);
  expect(confidentlyWrong).toBeLessThanOrEqual(2);
});

test('imports a dataset zip with a wrapper folder', async ({ page }) => {
  await zipInput(page).setInputFiles(await datasetZip(6));
  await expect(page.getByText(/Added 12 images\. Classes: blue, red\./)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel('Class name')).toHaveCount(2);
  await expect(page.getByLabel('Class name').nth(0)).toHaveValue('blue');
  await expect(classCard(page, 1).locator('.count')).toHaveText('6 samples');
});

test('explains a zip without class folders', async ({ page }) => {
  const { zipSync } = await import('fflate');
  const flat = zipSync(Object.fromEntries(images('red', 2).map((i) => [i.name, new Uint8Array(i.buffer)])));
  await zipInput(page).setInputFiles({
    name: 'flat.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(flat),
  });
  // A zip of loose images groups under its own name ("flat"), so it becomes a single class.
  await expect(page.getByLabel('Class name').nth(0)).toHaveValue('flat', { timeout: 30_000 });
});

test('restores the project and trained model after a reload', async ({ page }) => {
  await page.getByLabel('Class name').nth(0).fill('Red');
  await page.getByLabel('Class name').nth(1).fill('Blue');
  await addImages(page, 0, images('red', 6));
  await addImages(page, 1, images('blue', 6));
  await trainModel(page);
  await page.waitForTimeout(800); // auto-save is debounced

  await page.reload();
  await expect(page.locator('.model-status')).toHaveText(/Image model ready/, { timeout: 60_000 });
  await expect(page.getByLabel('Class name').nth(0)).toHaveValue('Red');
  await expect(classCard(page, 1).locator('.count')).toHaveText('6 samples');
  await expect(page.getByText(/^Trained\./)).toBeVisible();

  await testInput(page).setInputFiles(images('blue', 1, 50));
  await expect(page.locator('.result__headline').first()).toContainText('Blue');
});

test('exports a usable model zip', async ({ page }, testInfo) => {
  await page.getByLabel('Class name').nth(0).fill('Red');
  await page.getByLabel('Class name').nth(1).fill('Blue');
  await addImages(page, 0, images('red', 6));
  await addImages(page, 1, images('blue', 6));
  await trainModel(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export model (.zip)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('teachable-model.zip');
  const path = testInfo.outputPath('model.zip');
  await download.saveAs(path);
  const zip = unzipSync(new Uint8Array(await readFile(path)));
  expect(Object.keys(zip).sort()).toEqual(['README.md', 'metadata.json', 'model.json', 'weights.bin']);
  expect(JSON.parse(strFromU8(zip['metadata.json'])).labels).toEqual(['Red', 'Blue']);
  // MobileNet minus its 1000-class ImageNet layer (~0.94 MB) plus our small head.
  expect(zip['weights.bin'].byteLength).toBeGreaterThan(800_000);
});

test('exports a project and opens it again', async ({ page }, testInfo) => {
  await page.getByLabel('Class name').nth(0).fill('Red');
  await addImages(page, 0, images('red', 5));
  await addImages(page, 1, images('blue', 7));

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export project' }).click(),
  ]);
  const path = testInfo.outputPath('project.zip');
  await download.saveAs(path);

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(classCard(page, 0).locator('.count')).toHaveText('0 samples');

  await zipInput(page).setInputFiles(path);
  await expect(page.getByText(/Opened project with 2 classes/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel('Class name').nth(0)).toHaveValue('Red');
  await expect(classCard(page, 1).locator('.count')).toHaveText('7 samples');
  await trainModel(page);
});
