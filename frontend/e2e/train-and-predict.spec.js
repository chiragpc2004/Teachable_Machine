import { expect, test } from '@playwright/test';
import { images } from './fixtures.js';
import { addImages, classCard, openApp, testInput, trainModel } from './helpers.js';

test.beforeEach(({ page }) => openApp(page));

test('trains on two classes and predicts new images', async ({ page }) => {
  const nameInputs = page.getByLabel('Class name');
  await nameInputs.nth(0).fill('Red');
  await nameInputs.nth(1).fill('Blue');

  const train = page.getByRole('button', { name: 'Train model' });
  await expect(train).toBeDisabled();
  await addImages(page, 0, images('red', 8));
  await addImages(page, 1, images('blue', 8));
  await expect(train).toBeEnabled();
  await trainModel(page);
  await expect(page.getByText(/Got \d+% of \d+ held-back images right/)).toBeVisible();

  await testInput(page).setInputFiles([...images('red', 1, 100), ...images('blue', 1, 100)]);
  const headlines = page.locator('.result__headline');
  await expect(headlines).toHaveCount(2);
  // Newest first, in the order chosen.
  await expect(headlines.nth(0)).toContainText('Red');
  await expect(headlines.nth(1)).toContainText('Blue');
  await expect(page.locator('.results').getByText('Not sure')).toHaveCount(0);
});

test('explains what is missing before training is allowed', async ({ page }) => {
  await addImages(page, 0, images('red', 3));
  await expect(page.getByText('Add images to at least 2 classes.')).toBeVisible();
  await expect(page.getByText(/"Class 1" needs at least 5 images \(has 3\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Train model' })).toBeDisabled();
});

test('marks the model stale when classes change after training', async ({ page }) => {
  await addImages(page, 0, images('red', 6));
  await addImages(page, 1, images('blue', 6));
  await trainModel(page);
  await classCard(page, 0).getByRole('button', { name: 'Remove all images' }).click();
  await expect(page.getByText(/classes changed since training/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download model' })).toBeDisabled();
});

test('accepts images dropped onto a class', async ({ page }) => {
  const files = images('red', 5);
  const dataTransfer = await page.evaluateHandle(
    (specs) => {
      const dt = new DataTransfer();
      for (const s of specs)
        dt.items.add(new File([new Uint8Array(s.bytes)], s.name, { type: 'image/jpeg' }));
      return dt;
    },
    files.map((f) => ({ name: f.name, bytes: [...f.buffer] })),
  );
  const card = classCard(page, 1);
  await card.dispatchEvent('dragenter', { dataTransfer });
  await card.dispatchEvent('drop', { dataTransfer });
  await expect(card.locator('.count')).toHaveText('5 images', { timeout: 30_000 });
});
