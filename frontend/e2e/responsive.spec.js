import { expect, test } from './test.js';
import { openApp, trainModel } from './helpers.js';

const pageWidth = (page) => page.evaluate(() => document.documentElement.scrollWidth);

test('nothing scrolls sideways on a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openApp(page);
  expect(await pageWidth(page)).toBeLessThanOrEqual(360);

  await page.getByRole('button', { name: 'Try it with flowers' }).click();
  await expect(page.getByText(/Loaded 3 kinds of flowers/)).toBeVisible({ timeout: 60_000 });
  await trainModel(page);
  await page.getByRole('button', { name: 'Use sample test photos' }).click();
  await expect(page.locator('.result')).toHaveCount(9, { timeout: 30_000 });
  expect(await pageWidth(page)).toBeLessThanOrEqual(360);
});
