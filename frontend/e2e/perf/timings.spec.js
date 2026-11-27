import { expect, test } from '@playwright/test';
import { trainModel } from '../helpers.js';

// User-perceived timings for the sample journey. Opt-in (PERF=1) because numbers depend on the
// machine; record results in docs/QA.md together with the device they were measured on.
test.skip(!process.env.PERF, 'Set PERF=1 to run timing measurements');

test('sample journey timings', async ({ page }, testInfo) => {
  const t = {};
  let start = Date.now();
  await page.goto('/');
  await expect(page.locator('.page')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  t.modelReadyColdMs = Date.now() - start;
  const backend = await page.locator('.page').getAttribute('data-backend');

  start = Date.now();
  await page.getByRole('button', { name: 'Try it with flowers' }).click();
  await expect(page.getByText(/Loaded 3 kinds of flowers/)).toBeVisible({ timeout: 120_000 });
  t.sampleLoad60ImagesMs = Date.now() - start;

  start = Date.now();
  await trainModel(page);
  t.trainMs = Date.now() - start;

  start = Date.now();
  await page.getByRole('button', { name: 'Use sample test photos' }).click();
  await expect(page.locator('.result')).toHaveCount(9, { timeout: 60_000 });
  t.predict9ImagesMs = Date.now() - start;

  start = Date.now();
  await page.reload();
  await expect(page.locator('.page')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  t.reloadWithSavedProjectMs = Date.now() - start;

  console.log(`[perf] ${testInfo.project.name} (${backend}): ${JSON.stringify(t)}`);
});
