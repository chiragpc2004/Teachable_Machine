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

/**
 * Waits until auto-save has written the project (with `samples` images in total) and, if
 * `model` is set, the trained model to IndexedDB. Saving is debounced and asynchronous, so a
 * fixed wait is flaky on a busy machine.
 */
export async function waitForSaved(page, { samples, model = false }) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise((resolve) => {
              const open = indexedDB.open('keyval-store');
              open.onerror = () => resolve(null);
              open.onsuccess = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains('keyval')) return resolve(null);
                const store = db.transaction('keyval').objectStore('keyval');
                const project = store.get('eyebright:project:v1');
                const meta = store.get('eyebright:model-meta:v1');
                store.transaction.oncomplete = () =>
                  resolve({
                    samples: project.result?.classes.reduce((n, c) => n + c.samples.length, 0) ?? 0,
                    model: Boolean(meta.result),
                  });
              };
            }),
        ),
      { timeout: 15_000 },
    )
    .toEqual(model ? { samples, model: true } : expect.objectContaining({ samples }));
}
