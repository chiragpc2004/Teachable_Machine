import { expect } from '@playwright/test';

export async function openApp(page) {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.goto('/');
  await expect(page.locator('.page')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
}

export const classCard = (page, i) => page.locator('.class-card').nth(i);

export async function addImages(page, classIndex, files) {
  const card = classCard(page, classIndex);
  await card.locator('input[type=file]').setInputFiles(files);
  await expect(card.locator('.count')).toHaveText(`${files.length} images`, { timeout: 30_000 });
}

export async function trainModel(page) {
  await page.getByRole('button', { name: /^(Train model|Train again)$/ }).click();
  await expect(page.getByText('Model trained')).toBeVisible({ timeout: 60_000 });
}

export const testInput = (page) => page.locator('#test-title').locator('..').locator('input[type=file]');
