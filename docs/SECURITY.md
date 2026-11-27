# Security & privacy

## What the app handles

Everything runs in the visitor's browser. There is **no backend, no account and no database**, and the page makes no requests to other sites. The automated test `e2e/security.spec.js` checks this through the sample journey.

| Data                                           | Where it lives                               | Leaves the device?                                                        |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Original photos                                | In memory while they're processed, then gone | No                                                                        |
| Thumbnails (112 px JPEG) + 256-number features | IndexedDB in this browser                    | No; only if the user downloads a project file                             |
| Trained classifier                             | IndexedDB in this browser                    | Only if the user clicks **Download model**                                |
| Ordinary web requests                          | Seen by Cloudflare, the host, like any site  | They show which app files were fetched (and the IP address), never photos |

**New project** deletes the saved project and model. Clearing the site's data in browser settings does too. The app explains this under "Where are my photos kept?".

Because nothing is uploaded, the main risks are the usual ones for a static site: injected scripts, being framed by another site, and malicious files the user is tricked into opening.

## Response headers

Set in [`frontend/public/_headers`](../frontend/public/_headers), which Cloudflare Pages applies. `npm run preview` applies the same file (see `vite.config.js`), so **every E2E test runs under the production policy**, and any Content Security Policy violation fails the test (`e2e/test.js`).

| Header                                    | Value (summary)                                       | Why                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Content-Security-Policy                   | Everything `'self'`; no inline scripts or `eval`      | Even if an attacker got text into the page, the browser would refuse to run any script not served by us                   |
| ↳ `script-src 'wasm-unsafe-eval'`         | Allows compiling WebAssembly only                     | TensorFlow.js's 64-bit integer helper (long.js) builds a tiny WebAssembly module. JavaScript `eval` stays blocked         |
| ↳ `worker-src blob:`                      | Web Workers from in-memory scripts                    | fflate unzips in background workers that it creates this way                                                              |
| ↳ `img-src blob: data:`                   | In-memory images                                      | Thumbnails are shown from in-memory Blobs                                                                                 |
| ↳ `frame-ancestors 'none'`                | No embedding in other sites                           | Prevents clickjacking                                                                                                     |
| ↳ `object-src`, `base-uri`, `form-action` | `'none'`                                              | Closes old plugin, base-tag and form-hijacking tricks                                                                     |
| X-Content-Type-Options                    | `nosniff`                                             | Files are only treated as the type we say they are                                                                        |
| Referrer-Policy                           | `no-referrer`                                         | Following the credits link doesn't tell that site where you came from                                                     |
| Permissions-Policy                        | camera, microphone, geolocation and others turned off | The page needs none of them. Phone "Take Photo" uses the system picker, which doesn't need camera permission for the page |
| Cross-Origin-Opener/Resource-Policy       | `same-origin`                                         | Isolates the page from other sites' windows and stops them embedding our files                                            |
| Strict-Transport-Security                 | 1 year                                                | HTTPS only                                                                                                                |

**Adding a third-party script** (for example analytics in Phase 10) requires adding its domain to `script-src` and `connect-src`. The E2E tests will fail until you do, which is deliberate: the policy change should be a conscious, reviewed decision.

## Untrusted input

| Input                         | Limit or check                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image files                   | 15 MB each, decoded by the browser (not by our code). Undecodable files are reported and skipped. Photos are scaled down to 448 px on the short side before ML |
| Images per class / per import | 300 / 3,000                                                                                                                                                    |
| Zip files                     | Max 3,000 images and 400 MB uncompressed, checked from the zip directory **before** extracting (zip-bomb guard). Junk and non-image entries are ignored        |
| Project files                 | Must contain a valid `project.json` for the same feature extractor; checked before anything is imported                                                        |
| Class names                   | Max 40 characters, rendered as text (React escapes it), never as HTML                                                                                          |

Zip paths are never written to disk. They're only used to group images into classes, so path-traversal tricks (`../`) have nothing to attack.

## Dependencies

- **Runtime:** React, TensorFlow.js, fflate, idb-keyval, and a self-hosted font. That's all.
- `npm audit` reports **0 known vulnerabilities** (checked 2026-11-27, after upgrading the Vitest dev dependency from 3 to 5).
- Model weights and fonts are self-hosted, so there's no CDN dependency at runtime.
- Phase 10 adds Dependabot for update PRs.

## Reporting a problem

Open an issue on the GitHub repository. For anything sensitive, contact the maintainer privately first, through the GitHub profile.
