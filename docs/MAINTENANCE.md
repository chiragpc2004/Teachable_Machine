# Maintenance & monitoring

How to keep the app healthy after launch. Most of this takes a few minutes a week.

## Weekly routine (about 10 minutes)

1. **Dependabot PRs:** merge them when CI is green, except for the special cases below.
2. **New issues:** reports come in through the app's "Report a problem" link, which pre-fills the version and browser. Label them, and reproduce them on the preview URL.
3. **Analytics** (once enabled): look for sudden drops in visits. A drop can mean the site broke for one browser.

### Dependency updates that need more than green CI

| Update                                   | Why                                            | Extra check                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tensorflow/tfjs` (any)                 | Can change numerics, backends or model loading | `npm run validate-model -- <flower dir>`: accuracy should stay within a couple of points of [MODEL.md](MODEL.md). Then the manual section A of [QA.md](QA.md) on one phone |
| React major                              | Rendering changes                              | Click through the app on the preview URL                                                                                                                                   |
| Vite / Vitest / Playwright majors        | Build and test tooling                         | CI covers it. Check `npm run check-bundle` didn't jump                                                                                                                     |
| Anything that adds a third-party request | The CSP blocks it, and E2E fails               | Decide deliberately; see [SECURITY.md](SECURITY.md)                                                                                                                        |

**Never change the MobileNet weights or `FEATURE_EXTRACTOR_ID` casually.** Saved projects and project files store embeddings from that exact model, so changing it makes them unopenable. That change needs a new ID, a CHANGELOG entry, and a message in the app.

## Releasing

1. Merge to `main`. Cloudflare deploys production automatically ([DEPLOY.md](DEPLOY.md)).
2. Run the smoke tests against production: Actions → **Smoke test (deployed site)** → Run workflow with `https://eyebright.pages.dev`, unless they ran automatically.
3. For user-visible changes, bump `version` in `frontend/package.json`:
   - patch for fixes
   - minor for features
   - major for anything that breaks saved projects

   Then move the CHANGELOG's "Unreleased" items under the new version and tag it: `git tag v0.2.0 && git push --tags`.

## Rollback

See [DEPLOY.md → Rolling back](DEPLOY.md#rolling-back). It takes seconds in the Cloudflare dashboard. After a rollback, revert the bad commit on `main` so the next deploy doesn't bring it back.

**Rehearse it once after launch** (pending, needs the live site):

1. Note the current production deployment.
2. Roll back to the previous one, and check that the footer shows the previous version.
3. Roll forward again, and check the footer shows the new version.
4. Record the date here: _not yet done_.

## Monitoring

| What                  | How                                                                                 | Status                          |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| Is it up and working? | Smoke tests after each deploy; Cloudflare's deployment status                       | Ready (runs once deployed)      |
| Visits                | Cloudflare Web Analytics: no cookies, no personal data                              | **To do** once the site is live |
| Errors users hit      | "Report a problem" link: a pre-filled GitHub issue, sent only if the person chooses | Done                            |
| Dependency security   | Dependabot plus `npm audit` in review                                               | Done                            |

### Turning on Cloudflare Web Analytics (once live)

The beacon is a script from `static.cloudflareinsights.com` that reports to `cloudflareinsights.com`. The Content Security Policy blocks both until they're allowed, which is deliberate. In one PR:

1. In `frontend/public/_headers`, add `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src`.
2. In `e2e/security.spec.js`, allow those two hosts in "makes no requests to other sites".
3. Update [SECURITY.md](SECURITY.md) and the in-app "Where are my photos kept?" text if needed. The beacon sees page views, never images.
4. In Cloudflare: **project → Metrics → Web Analytics → Enable**.

**Why no automatic error tracker (such as Sentry)?** It would send data about visitors' sessions to a third party by default. For an app whose promise is "nothing leaves your device", an opt-in report the person sees before sending fits better. Revisit this if reports turn out too sparse to debug.

## Backlog (not committed to)

Roughly in order of expected value:

1. **Webcam capture and live prediction:** the main feature left out of v1 (dropped 2026-11-27).
2. **Offline support (PWA):** for classrooms with poor Wi-Fi. Mind the stale-version risk ([QA.md](QA.md#known-limitations-current)).
3. **"None of these" guidance:** suggest adding a background class when tests are often "Not sure".
4. **Dark theme.**
5. **Larger MobileNet option** for better accuracy on desktops (needs a new `FEATURE_EXTRACTOR_ID`).
6. **Export to TensorFlow Lite / ONNX** for use outside the browser.
7. **Translations.**
8. **Audio and pose models:** a different pipeline each, so a larger project.
