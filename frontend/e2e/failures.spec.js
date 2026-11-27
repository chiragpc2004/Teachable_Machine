import { expect, test } from './test.js';
import { images } from './fixtures.js';
import { addImages, classCard, openApp, trainModel } from './helpers.js';

// What people see when things go wrong. Each case must end in a clear message and a way forward,
// never a blank page or a silent failure.

test('image model fails to download: explains and offers a reload', async ({ page }) => {
  await page.route('**/models/**/*', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /image model didn.t load/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
});

test('no WebGL: falls back to the CPU and still trains', async ({ page }) => {
  await page.addInitScript(() => {
    // TF.js may use <canvas> or OffscreenCanvas for WebGL; refuse both.
    for (const Canvas of [globalThis.HTMLCanvasElement, globalThis.OffscreenCanvas].filter(Boolean)) {
      const original = Canvas.prototype.getContext;
      Canvas.prototype.getContext = function (type, ...rest) {
        return /webgl/i.test(type) ? null : original.call(this, type, ...rest);
      };
    }
  });
  await openApp(page);
  await expect(page.locator('.page')).toHaveAttribute('data-backend', 'cpu');
  await addImages(page, 0, images('red', 5));
  await addImages(page, 1, images('blue', 5));
  await trainModel(page);
});

test('unreadable and non-image files are reported, good ones still added', async ({ page }) => {
  await openApp(page);
  const broken = { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not really a jpeg') };
  await classCard(page, 0)
    .locator('input[type=file]')
    .setInputFiles([...images('red', 3), broken]);
  await expect(
    page.getByText(/Added 3 images\. 1 couldn't be read \("broken\.jpg" isn't an image/),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(classCard(page, 0).locator('.count')).toHaveText('3 images');
});

test('a file named .zip that is not a zip gets a clear error', async ({ page }) => {
  await openApp(page);
  await page
    .locator('.import input[accept*=".zip"]')
    .setInputFiles({ name: 'fake.zip', mimeType: 'application/zip', buffer: Buffer.from('nope') });
  await expect(page.getByRole('alert')).toContainText(`"fake.zip" couldn't be opened as a zip file.`);
});

test('a project file from another app version or model is refused clearly', async ({ page }) => {
  const { zipSync, strToU8 } = await import('fflate');
  await openApp(page);
  const zip = zipSync({
    'project.json': strToU8(
      JSON.stringify({ format: 'eyebright-project', version: 1, featureExtractor: 'other' }),
    ),
  });
  await page
    .locator('.import input[accept*=".zip"]')
    .setInputFiles({ name: 'old-project.zip', mimeType: 'application/zip', buffer: Buffer.from(zip) });
  await expect(page.getByRole('alert')).toContainText('made with a different image model');
});

test('storage blocked: the app still works and says how to keep a copy', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Blocked for test', 'SecurityError');
    };
  });
  await openApp(page);
  await addImages(page, 0, images('red', 5));
  await expect(page.getByText(/Couldn't save your project in this browser/)).toBeVisible({ timeout: 10_000 });
  await addImages(page, 1, images('blue', 5));
  await trainModel(page);
});

test('sample download fails: explains instead of hanging', async ({ page }) => {
  await openApp(page);
  await page.route('**/samples/**', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Try it with flowers' }).click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Try it with flowers' })).toBeEnabled();
});
