// Working name. Change it here (and in index.html) when the final name is chosen.
export const APP_NAME = 'Teachable';

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

const ISSUES_URL = 'https://github.com/chiragpc2004/Teachable_Machine/issues/new';

/**
 * Link to a pre-filled bug report on GitHub. It only fills in the app version, the browser and
 * (if given) the error message. Nothing is sent until the person reviews the form and submits it.
 */
export function reportProblemUrl(error) {
  const params = new URLSearchParams({
    template: 'bug.yml',
    version: APP_VERSION,
    browser: navigator.userAgent,
  });
  if (error) params.set('error', String(error.message ?? error).slice(0, 500));
  return `${ISSUES_URL}?${params}`;
}
