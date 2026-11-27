import { expect, test } from './test.js';

// The production headers come from public/_headers, which `vite preview` applies too. Every spec
// also fails on any Content Security Policy violation (see ./test.js), so these checks only
// cover that the headers are actually sent.

test('serves the security headers', { tag: '@smoke' }, async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toContain("object-src 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['permissions-policy']).toContain('camera=()');
});

test(
  'caches hashed assets forever and the page itself not at all',
  { tag: '@smoke' },
  async ({ page, request }) => {
    await page.goto('/');
    const script = await page.locator('script[type=module]').getAttribute('src');
    expect((await request.get(script)).headers()['cache-control']).toContain('immutable');
    expect((await request.get('/')).headers()['cache-control'] ?? '').not.toContain('immutable');
  },
);

test('makes no requests to other sites', { tag: '@smoke' }, async ({ page, baseURL }) => {
  const own = new URL(baseURL).hostname;
  const external = [];
  page.on('request', (req) => {
    if (/^(blob|data):/.test(req.url())) return;
    if (new URL(req.url()).hostname !== own) external.push(req.url());
  });
  await page.goto('/');
  await expect(page.locator('.page')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 });
  await page.getByRole('button', { name: /Try it with flowers/ }).click();
  await expect(page.getByText(/Loaded 3 kinds of flowers/)).toBeVisible({ timeout: 60_000 });
  expect(external).toEqual([]);
});

test('footer shows the version and a pre-filled problem report link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.footer')).toContainText(/Version \d+\.\d+\.\d+/);
  const href = await page.getByRole('link', { name: 'Report a problem' }).getAttribute('href');
  const url = new URL(href);
  expect(url.hostname).toBe('github.com');
  expect(url.searchParams.get('template')).toBe('bug.yml');
});
