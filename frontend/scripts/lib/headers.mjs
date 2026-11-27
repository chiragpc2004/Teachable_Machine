/**
 * Minimal reader for Cloudflare Pages `_headers` files: blocks of a URL pattern followed by
 * indented `Name: value` lines. Supports `*` wildcards, which is all our file uses.
 * @returns {{ pattern: RegExp, headers: [string, string][] }[]}
 */
export function parseHeadersFile(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const source = line
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      rules.push({ pattern: new RegExp(`^${source}$`), headers: [] });
    } else if (rules.length) {
      const i = line.indexOf(':');
      if (i > 0) rules.at(-1).headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

/** Headers for a request path; later matching rules add to (and override) earlier ones. */
export function headersFor(rules, path) {
  const out = new Map();
  for (const rule of rules) if (rule.pattern.test(path)) for (const [k, v] of rule.headers) out.set(k, v);
  return out;
}
