/**
 * Bundle size budget, checked in CI after `npm run build`. Sizes are gzipped, which is roughly
 * what visitors download.
 *
 *   initial: the JS and CSS that index.html loads before anything appears on screen
 *   total:   all JavaScript, including TensorFlow.js, which loads after the page renders
 *
 * If a change breaks the budget, either trim it or raise the budget here on purpose.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Set in Phase 8 at about 5–25% above the sizes then (79 KB and 362 KB).
const BUDGET_KB = { initial: 100, total: 380 };

const dist = new URL('../dist/', import.meta.url);
const gz = (file) => gzipSync(readFileSync(new URL(file, dist))).length / 1024;

const html = readFileSync(new URL('index.html', dist), 'utf8');
const initialFiles = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const jsFiles = readdirSync(new URL('assets/', dist))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/${f}`);

const sizes = {
  initial: initialFiles.reduce((n, f) => n + gz(f), 0),
  total: jsFiles.reduce((n, f) => n + gz(f), 0),
};

let failed = false;
for (const [name, kb] of Object.entries(sizes)) {
  const ok = kb <= BUDGET_KB[name];
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'OVER'} ${name.padEnd(8)} ${kb.toFixed(1)} KB gzipped (budget ${BUDGET_KB[name]} KB)`,
  );
}
for (const f of jsFiles.sort((a, b) => gz(b) - gz(a)))
  console.log(`     ${gz(f).toFixed(1).padStart(6)} KB  ${f}`);
if (failed) process.exit(1);
