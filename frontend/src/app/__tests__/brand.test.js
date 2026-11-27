import { describe, expect, it } from 'vitest';
import { APP_VERSION, reportProblemUrl } from '../brand.js';

describe('reportProblemUrl', () => {
  it('pre-fills the bug template with version and browser only', () => {
    const url = new URL(reportProblemUrl());
    expect(url.origin + url.pathname).toBe('https://github.com/chiragpc2004/Teachable_Machine/issues/new');
    expect(url.searchParams.get('template')).toBe('bug.yml');
    expect(url.searchParams.get('version')).toBe(APP_VERSION);
    expect(url.searchParams.has('browser')).toBe(true);
    expect(url.searchParams.has('error')).toBe(false);
  });

  it('adds a trimmed error message when given one', () => {
    const url = new URL(reportProblemUrl(new Error('x'.repeat(2000))));
    expect(url.searchParams.get('error')).toHaveLength(500);
  });
});
