# Teachable

Train an image classifier in your browser. You don't write code, and your images never leave your device.

Inspired by [Google's Teachable Machine](https://teachablemachine.withgoogle.com/). This is an independent project.

> **Status: Phase 9 (deployment).** The full journey works, is tested in five browser projects, and runs under a strict Content Security Policy. It's ready to deploy to Cloudflare Pages: see [docs/DEPLOY.md](docs/DEPLOY.md). Product spec: [docs/PRODUCT.md](docs/PRODUCT.md).

## How it works

1. You add example images to two or more classes.
2. Each image goes through **MobileNet**, a small pretrained image network running in your browser via TensorFlow.js. MobileNet turns the image into 256 numbers that describe it.
3. A tiny classifier is trained on those numbers in about a second. This is _transfer learning_, the same approach Google's tool uses.
4. When you test a new image, you get a probability for every class. Low-confidence answers are shown as "Not sure".

Details and measured accuracy are in [docs/MODEL.md](docs/MODEL.md).

## Run locally

Requires Node 22.12+.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

| Command                                         | What it does                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                 | Production build into `frontend/dist/` (static files only)                                                                                                                                                                                |
| `npm run preview`                               | Serve the production build locally                                                                                                                                                                                                        |
| `npm test`                                      | Unit tests (Vitest), including loading the real MobileNet weights                                                                                                                                                                         |
| `npm run test:e2e`                              | Browser tests (Playwright: Chromium, Firefox, WebKit, emulated Android + iPhone) against the production build, including WCAG 2.2 AA checks (axe-core) and a 360 px layout check. Run `npx playwright install chromium webkit` once first |
| `npm run check-bundle`                          | After a build: checks download sizes against the budget (first load ≤ 100 KB, all JS ≤ 380 KB, gzipped)                                                                                                                                   |
| `npm run test:smoke`                            | The `@smoke` subset of E2E tests. With `SMOKE_URL=https://…` it tests a deployed site instead of a local build                                                                                                                            |
| `npm run perf`                                  | Timings of the sample journey in each browser project                                                                                                                                                                                     |
| `npm run lint` / `npm run format`               | ESLint / Prettier                                                                                                                                                                                                                         |
| `npm run fetch-model`                           | Re-download the MobileNet weights into `public/models/`                                                                                                                                                                                   |
| `npm run validate-model -- <dir>`               | Measure accuracy on a folder-per-class image dataset                                                                                                                                                                                      |
| `node scripts/build-sample.mjs <flower_photos>` | Rebuild the bundled sample project (with photo credits)                                                                                                                                                                                   |

CI (GitHub Actions) runs lint, format check, unit tests, build, the bundle budget and E2E tests on every push and pull request.

## Project structure

```
frontend/
├── public/_headers      # Security + cache headers (Cloudflare Pages; also applied by `npm run preview`)
├── public/models/       # Self-hosted MobileNet weights (1.96 MB)
├── public/samples/      # Sample project: 3 flower classes, CC-BY photos with credits
├── src/
│   ├── ml/              # Framework-free ML: preprocess, feature extractor, classifier, export
│   ├── project/         # Project state, zip/folder import, saving (IndexedDB), project files
│   ├── app/             # App.jsx, the ML engine (loaded lazily) and its hook, sample loader
│   └── ui/              # React components
├── scripts/             # fetch-model, validate-model, build-sample, check-bundle
└── e2e/                 # Playwright tests
docs/MODEL.md            # Pipeline, accuracy numbers, export format, limitations
docs/PRODUCT.md          # v1 product spec
docs/QA.md               # Test inventory, timings, manual device checklist, release gate
docs/SECURITY.md         # Privacy, security headers, input limits, dependencies
docs/DEPLOY.md           # Cloudflare Pages setup, previews, rollback, custom domain
```

## History

Before this milestone, the project was a FastAPI + scikit-learn backend that trained a Random Forest on raw pixels. That version lives at the git tag `legacy-fastapi`. It was retired because every visitor shared one global model, which made it unsafe to deploy publicly. Training in the browser also turned out to be much more accurate (see docs/MODEL.md).

## License

[MIT](./LICENSE)
