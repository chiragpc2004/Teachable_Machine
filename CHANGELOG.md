# Changelog

Notable changes, newest first. Versions follow [semantic versioning](https://semver.org): the version is in `frontend/package.json` and appears in the app's footer.

## [Unreleased]

## [0.1.0]: first public release (not yet deployed)

A rebuild of the project as a browser-only app.

### Added

- **Train in the browser:** transfer learning on MobileNet v1 (α 0.25) with TensorFlow.js. Images never leave the device. 86.8% held-out accuracy on real flower photos, against 58.5% for the old version ([MODEL.md](docs/MODEL.md)).
- **Getting images in:** add them with the file picker (including "Take Photo" on phones), drag and drop, folders, or a dataset zip that has one folder per class.
- **Training:** a checklist of what's missing, a progress bar, and held-back accuracy with a caveat for small sets.
- **Testing:** batch testing, a confidence bar per class, and "Not sure" below 60%.
- **Saving:** projects save automatically in the browser. You can download the trained model (a TF.js zip with a usage snippet) and save or open project files.
- A flower sample project for first-time visitors, with CC-BY photos and credits.
- Accessible design: WCAG 2.2 AA checks, keyboard use and screen-reader announcements.
- **Testing and CI:** unit tests, Playwright E2E in Chromium, Firefox, WebKit and emulated phones, failure-scenario tests, and CI on every PR.
- **Security:** a strict Content Security Policy and security headers, zip-bomb limits, a bundle size budget, and lazy-loaded ML code (first download 79 KB gzipped).
- **Deployment:** setup for Cloudflare Pages, plus smoke tests that run against the deployed site.
- **Reporting problems:** a version number and a "Report a problem" link (a pre-filled GitHub issue), and Dependabot for dependency updates.

### Removed

- The FastAPI + scikit-learn backend, kept at git tag `legacy-fastapi`. Every visitor shared one global model, and it trained a Random Forest on raw pixels.
- Webcam capture is out of scope for v1.
