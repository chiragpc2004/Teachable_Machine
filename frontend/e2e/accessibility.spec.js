import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './test.js';
import { openApp, trainModel } from './helpers.js';

// WCAG 2.2 A + AA rules, checked by axe-core. This catches contrast, labels, roles and
// structure problems; it doesn't replace testing with a keyboard and a screen reader.
const scan = (page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

const describe = (violations) =>
  violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );

test.beforeEach(({ page }) => openApp(page));

// axe checks the DOM (labels, roles, contrast), which is the same in every engine. In CI,
// injecting axe crashes headless Firefox on Linux ("Page crashed" inside axe's evaluate), while
// every other Firefox test on the same pages passes. So scans run in Chromium and WebKit only.
const skipAxeInFirefox = (browserName) =>
  test.skip(
    browserName === 'firefox',
    'axe injection crashes headless Firefox in CI; DOM is engine-independent',
  );

test('first visit has no WCAG A/AA violations', async ({ page, browserName }) => {
  skipAxeInFirefox(browserName);
  const { violations } = await scan(page);
  expect(describe(violations)).toEqual([]);
});

test('trained and tested state has no WCAG A/AA violations', async ({ page, browserName }) => {
  skipAxeInFirefox(browserName);
  await page.getByRole('button', { name: 'Try it with flowers' }).click();
  await expect(page.getByText(/Loaded 3 kinds of flowers/)).toBeVisible({ timeout: 60_000 });
  await trainModel(page);
  await page.getByRole('button', { name: 'Use sample test photos' }).click();
  await expect(page.locator('.result')).toHaveCount(9, { timeout: 30_000 });
  const { violations } = await scan(page);
  expect(describe(violations)).toEqual([]);
});

test('the main journey works from the keyboard', async ({ page, browserName }) => {
  // Tab to the sample button and activate it with Enter, then train with Space.
  // Safari only tabs to buttons with Option+Tab (unless a system setting is changed).
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const sample = page.getByRole('button', { name: 'Try it with flowers' });
  for (let i = 0; i < 10 && !(await sample.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press(tab);
  }
  await expect(sample).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Loaded 3 kinds of flowers/)).toBeVisible({ timeout: 60_000 });
  const train = page.getByRole('button', { name: 'Train model' });
  await train.focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('Model trained')).toBeVisible({ timeout: 60_000 });
});
