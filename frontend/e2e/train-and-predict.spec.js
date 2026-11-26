import { expect, test } from '@playwright/test';
import { images } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.goto('/');
  await expect(page.getByRole('status').first()).toHaveText(/Image model ready/, { timeout: 60_000 });
});

async function addImages(page, classIndex, files) {
  const card = page.locator('.class-card').nth(classIndex);
  await card.locator('input[type=file]').setInputFiles(files);
  await expect(card.locator('.count')).toHaveText(`${files.length} samples`, { timeout: 30_000 });
}

test('trains on two classes and predicts a new image', async ({ page }) => {
  const nameInputs = page.getByLabel('Class name');
  await nameInputs.nth(0).fill('Red');
  await nameInputs.nth(1).fill('Blue');

  const train = page.getByRole('button', { name: 'Train model' });
  await expect(train).toBeDisabled();

  await addImages(page, 0, images('red', 8));
  await addImages(page, 1, images('blue', 8));
  await expect(train).toBeEnabled();
  await train.click();

  await expect(page.getByText(/Trained\. Accuracy on held-back samples: \d+%/)).toBeVisible({
    timeout: 60_000,
  });

  await page
    .locator('#predict-title')
    .locator('..')
    .locator('input[type=file]')
    .setInputFiles(images('red', 1, 100));
  const headline = page.locator('.result__headline');
  await expect(headline).toContainText('Red');
  await expect(headline).not.toContainText('Not sure');
  await expect(page.locator('.bars li')).toHaveCount(2);
});

test('explains what is missing before training is allowed', async ({ page }) => {
  await addImages(page, 0, images('red', 3));
  await expect(page.getByText('Add samples to at least 2 classes.')).toBeVisible();
  await expect(page.getByText(/"Class 1" needs at least 5 samples \(has 3\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Train model' })).toBeDisabled();
});

test('marks the model stale when samples change after training', async ({ page }) => {
  await addImages(page, 0, images('red', 6));
  await addImages(page, 1, images('blue', 6));
  await page.getByRole('button', { name: 'Train model' }).click();
  await expect(page.getByText(/^Trained\./)).toBeVisible({ timeout: 60_000 });
  await page.locator('.class-card').nth(0).getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText(/samples changed since training/)).toBeVisible();
});
