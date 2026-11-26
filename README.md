# Teachable

Train an image classifier in your browser. You don't write code, and your images never leave your device.

Inspired by [Google's Teachable Machine](https://teachablemachine.withgoogle.com/). This is an independent project.

> **Status: Milestone 1 (foundation + in-browser model).** The page is a working developer harness: add images to classes, train, and test with per-class confidence. Zip and folder import, saving, export and the polished UI come next. See [docs/PRODUCT.md](docs/PRODUCT.md).

## How it works

1. You add example images to two or more classes.
2. Each image goes through **MobileNet**, a small pretrained image network running in your browser via TensorFlow.js. MobileNet turns the image into 256 numbers that describe it.
3. A tiny classifier is trained on those numbers in about a second. This is *transfer learning*, the same approach Google's tool uses.
4. When you test a new image, you get a probability for every class. Low-confidence answers are shown as "Not sure".

Details and measured accuracy are in [docs/MODEL.md](docs/MODEL.md).

## Run locally

Requires Node 20+.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run build` | Production build into `frontend/dist/` (static files only) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest), including loading the real MobileNet weights |
| `npm run test:e2e` | Browser tests (Playwright, Chromium + WebKit) against the production build. Run `npx playwright install chromium webkit` once first |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run fetch-model` | Re-download the MobileNet weights into `public/models/` |
| `npm run validate-model -- <dir>` | Measure accuracy on a folder-per-class image dataset |

CI (GitHub Actions) runs lint, format check, unit tests, build and E2E tests on every push and pull request.

## Project structure

```
frontend/
├── public/models/       # Self-hosted MobileNet weights (1.96 MB)
├── src/
│   ├── ml/              # Framework-free ML code: preprocess, feature extractor, classifier, rules
│   ├── lab/             # React UI for the milestone-1 harness
│   └── App.jsx
├── scripts/             # fetch-model, validate-model
└── e2e/                 # Playwright tests
docs/MODEL.md            # Pipeline, accuracy numbers, limitations
```

## History

Before this milestone, the project was a FastAPI + scikit-learn backend that trained a Random Forest on raw pixels. That version lives at the git tag `legacy-fastapi`. It was retired because every visitor shared one global model, which made it unsafe to deploy publicly. Training in the browser also turned out to be much more accurate (see docs/MODEL.md).

## License

[MIT](./LICENSE)
