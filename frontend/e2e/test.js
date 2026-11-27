import { expect, test as base } from '@playwright/test';

/**
 * Playwright's `test`, plus a guard that fails any test in which the page breaks the Content
 * Security Policy (public/_headers, served by `vite preview`). Specs import `test` from here.
 */
export const test = base.extend({
  cspViolations: [
    async ({ page }, use) => {
      const violations = [];
      await page.exposeFunction('__reportCspViolation', (v) => violations.push(v));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) =>
          window.__reportCspViolation(`${e.violatedDirective} blocked ${e.blockedURI || '(inline)'}`),
        );
      });
      await use(violations);
      expect(violations, 'Content Security Policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
