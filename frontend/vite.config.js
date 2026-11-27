import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { headersFor, parseHeadersFile } from './scripts/lib/headers.mjs';

/**
 * Applies public/_headers (the production security and cache headers) to `vite preview`, so
 * the production build is tested locally under the same Content Security Policy. Not used by
 * the dev server, whose hot-reload code needs looser rules.
 */
function productionHeaders() {
  return {
    name: 'production-headers',
    configurePreviewServer(server) {
      const rules = parseHeadersFile(readFileSync(new URL('./public/_headers', import.meta.url), 'utf8'));
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        for (const [name, value] of headersFor(rules, path)) res.setHeader(name, value);
        next();
      });
    },
  };
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// Cloudflare Pages and GitHub Actions both expose the commit being built.
const commit = (process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '').slice(0, 7);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), productionHeaders()],
  define: {
    // Shown in the footer and in bug reports, so a report says exactly which build it's about.
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(commit ? `${pkg.version} (${commit})` : pkg.version),
  },
  build: {
    // TensorFlow.js is one ~250 KB (gzipped) chunk that loads after the page renders.
    // scripts/check-bundle.mjs enforces our real size budget instead of this warning.
    chunkSizeWarningLimit: 1000,
  },
});
