const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp)$/i;

export const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

export const isImagePath = (path) => IMAGE_EXTENSIONS.test(path);

/** macOS resource forks, hidden files and folders (".DS_Store", "__MACOSX/…", ".git/…"). */
export const isJunkPath = (path) => path.split('/').some((seg) => seg.startsWith('.') || seg === '__MACOSX');

export const mimeForPath = (path) => MIME_BY_EXTENSION[path.split('.').pop().toLowerCase()] ?? '';

/**
 * Works out classes from the relative paths of a dataset (zip entries or a dropped folder).
 *
 * Expected layout is one folder per class. Wrapping folders that every path shares are
 * stripped, so "flowers.zip → flowers/daisy/1.jpg" yields class "daisy" (this is what
 * "Compress folder" on macOS/Windows produces). Deeper sub-folders are flattened into their
 * top-level class. Images not inside any class folder are reported as `loose`.
 *
 * @param {string[]} paths forward-slash relative paths
 * @returns {{ classes: { name: string, paths: string[] }[], loose: number, skipped: number }}
 */
export function groupByClass(paths) {
  let skipped = 0;
  let entries = [];
  for (const path of paths) {
    if (path.endsWith('/')) continue; // directory entry
    if (isJunkPath(path) || !isImagePath(path)) {
      skipped++;
      continue;
    }
    entries.push({ path, segments: path.split('/').filter(Boolean) });
  }

  // Strip wrapper folders shared by every entry, as long as something stays inside a class folder.
  while (
    entries.length > 0 &&
    entries.every((e) => e.segments.length >= 2 && e.segments[0] === entries[0].segments[0]) &&
    entries.some((e) => e.segments.length >= 3)
  ) {
    entries = entries.map((e) => ({ ...e, segments: e.segments.slice(1) }));
  }

  const byClass = new Map();
  let loose = 0;
  for (const e of entries) {
    if (e.segments.length < 2) {
      loose++;
      continue;
    }
    const name = e.segments[0];
    if (!byClass.has(name)) byClass.set(name, []);
    byClass.get(name).push(e.path);
  }

  const classes = [...byClass.entries()]
    .map(([name, classPaths]) => ({ name, paths: classPaths.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { classes, loose, skipped };
}
