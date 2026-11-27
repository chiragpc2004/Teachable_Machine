# Testing & QA

How we know the app works, what still needs a human, and what must pass before a release.

## Automated tests

Run from `frontend/`. CI runs all of them on every push and pull request.

| Layer                    | Command                           | What it covers                                                                                                                                                                                                                            |
| ------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest, Node)      | `npm test`                        | Preprocessing, the real MobileNet weights, classifier training and memory, dataset rules, stratified split, "Not sure" logic, zip/folder path grouping, project state, project file round trip, exported model matches in-app predictions |
| End-to-end (Playwright)  | `npm run test:e2e`                | Full journeys against the production build in five browser projects (below)                                                                                                                                                               |
| Accessibility (axe-core) | part of E2E                       | WCAG 2.2 A/AA rules on first visit and on the trained + tested state; keyboard-only journey                                                                                                                                               |
| Layout                   | part of E2E                       | No sideways scrolling at 360 px, before and after training                                                                                                                                                                                |
| Failure scenarios        | part of E2E                       | Model download fails, no WebGL (CPU fallback), unreadable images, fake zip, incompatible project file, storage blocked, sample download fails, 12 MP phone-size photos                                                                    |
| Security                 | part of E2E                       | Every test fails on any Content Security Policy violation (`e2e/test.js`). `security.spec.js` checks the headers, caching and that no request goes to another site. See [SECURITY.md](SECURITY.md)                                        |
| Bundle budget            | `npm run check-bundle`            | After a build: first load ≤ 100 KB, all JS ≤ 380 KB (gzipped)                                                                                                                                                                             |
| Accuracy                 | `npm run validate-model -- <dir>` | Held-out accuracy on real photos (see [MODEL.md](MODEL.md))                                                                                                                                                                               |
| Smoke (deployed site)    | `npm run test:smoke`              | Tests tagged `@smoke`: sample journey, reload, export, headers, no other sites, first-visit accessibility. With `SMOKE_URL` set, they run against a deployed site (see [DEPLOY.md](DEPLOY.md))                                            |
| Timings                  | `npm run perf`                    | User-perceived timings of the sample journey (opt-in; machine-dependent)                                                                                                                                                                  |

### Browser projects

| Project        | Engine                      | Notes                                                                                                                                                                                                                                                                                                      |
| -------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chromium       | Chromium                    | Also stands in for Edge, which uses the same engine                                                                                                                                                                                                                                                        |
| firefox        | Gecko                       | Runs in CI (Linux). Playwright's Firefox build doesn't start on the maintainer's current macOS ("Could not find profile folder"), so locally use `--project=chromium --project=webkit`. axe scans are skipped in Firefox because injecting axe crashes headless Firefox in CI; all other Firefox tests run |
| webkit         | WebKit                      | Safari's engine                                                                                                                                                                                                                                                                                            |
| mobile-android | Chromium, Pixel 7 emulation | Viewport, touch and user agent only, not real phone hardware                                                                                                                                                                                                                                               |
| mobile-iphone  | WebKit, iPhone 13 emulation | Same caveat                                                                                                                                                                                                                                                                                                |

### Measured timings

2026-11-27, after the Phase 8 speed-ups. Headless browsers on the maintainer's Mac (Apple Silicon). "Mobile" rows are emulated on the same Mac, so they are **not** phone performance.

| Project                   | Model ready (cold) | Load sample (60 images) | Train | Test 9 images | Reload with saved project |
| ------------------------- | ------------------ | ----------------------- | ----- | ------------- | ------------------------- |
| chromium                  | 0.8 s              | 7.4 s                   | 1.0 s | 1.4 s         | 0.6 s                     |
| webkit                    | 0.7 s              | 2.5 s                   | 1.7 s | 0.4–0.9 s     | 0.5 s                     |
| mobile-android (emulated) | 1.5 s              | 6.1 s                   | 1.0 s | 1.3 s         | 1.3 s                     |
| mobile-iphone (emulated)  | 0.7 s              | 2.5 s                   | 1.7 s | 0.4 s         | 0.5 s                     |

- **Headless Chromium has no GPU.** It renders WebGL with SwiftShader, a software emulator, so its image steps (loading the sample, testing) are much slower than real Chrome. WebKit uses the Mac's real GPU.
- **Training** was 3.3–5.5 s before Phase 8. The small classifier now trains on the CPU, where it's faster ([MODEL.md](MODEL.md)).
- **Testing** in Chromium went from 0.8 s to 1.4 s, because the first test after training moves the classifier to the GPU. Training plus the first test is still faster overall: 2.4 s, down from 5.9 s.
- **First download:** the page shell is 79 KB gzipped and appears straight away. TensorFlow.js (~285 KB) loads after it; before Phase 8 the page waited for all 331 KB.

## Manual checks (need real devices)

Automation can't cover these: real phone GPUs and memory, the system photo picker, real folder drag-and-drop in Safari, and screen readers. Run them before the first public release and after any big UI change. Use the production build (`npm run build && npm run preview -- --host`, then open the shown network URL on the phone) or the deployed preview URL.

Record results in the table at the bottom.

### A. Core journey: every device

1. Open the app. The intro shows, and "Try it with flowers" becomes active within a few seconds.
2. Tap **Try it with flowers**. Three classes fill with 20 images each.
3. Tap **Train model**. The progress bar moves, then "Model trained" appears with an accuracy line.
4. Tap **Use sample test photos**. Nine results appear, each with three bars and a 60% tick.
5. Reload the page. Classes, images and "Model trained" are still there.
6. Tap **Download model**. A `eyebright-model.zip` downloads (on iOS it goes to Files → Downloads).
7. **New project** → confirm. The page is empty again.

### B. Own images

1. Rename "Class 1" and "Class 2", then add at least 5 photos to each with **Add images**.
2. **Phones:** in the picker, choose **Take Photo** (iOS) or **Camera** (Android), take a photo, and confirm it's added.
3. Train and test with a new photo.
4. **Desktop:** drag a few image files onto a class. They're added.
5. **Desktop:** drag a **folder** of images onto a class, then drag a folder _of class folders_ onto the import box. Check this especially in **real Safari**: automation can't simulate a real folder drop there.
6. **Choose .zip** with a zip made by right-click → Compress (macOS) or Send to → Compressed folder (Windows). Classes are created from the folder names.

### C. Screen reader (desktop VoiceOver on Safari, and NVDA or JAWS on Windows if available)

1. Headings list (VO: Rotor → Headings): intro title, "1 Add example images…", "2 Train", "3 Test".
2. Each class card is announced as "Class ⟨name⟩", the name field as "Class name", and the image count is read.
3. After **Train model**, the result ("Model trained, Got N% of …") is announced without moving focus.
4. Test results are announced, and each bar reads as a meter with its class name and percentage.
5. Errors (for example a fake .zip) are announced immediately.

### D. Visual / zoom

1. Browser zoom at 200%: no text is cut off and nothing overlaps.
2. iOS **Settings → Accessibility → Display & Text Size → Larger Text** at a large size: layout still works.
3. Reduce Motion on: bars appear without the grow animation.

### Results

| Date          | Device / OS    | Browser | A   | B   | C   | D   | Notes |
| ------------- | -------------- | ------- | --- | --- | --- | --- | ----- |
| _not yet run_ | iPhone (iOS ?) | Safari  |     |     |     |     |       |
| _not yet run_ | Android phone  | Chrome  |     |     |     |     |       |
| _not yet run_ | Mac            | Safari  |     |     |     |     |       |
| _not yet run_ | Mac or Windows | Firefox |     |     |     |     |       |
| _not yet run_ | Windows        | Edge    |     |     |     |     |       |

## Release gate

A build can be deployed to production only when all of these hold:

- [ ] CI green: lint, format, unit, build, bundle budget, E2E in all five browser projects (including the CSP guard)
- [ ] Manual section A passes on at least one real iPhone and one real Android phone
- [ ] Manual section B.5 (folder drop) passes in real Safari, or the limitation is documented
- [ ] Manual section C passes with VoiceOver, with no blocking issues
- [ ] No console errors during section A on any device
- [ ] README, [MODEL.md](MODEL.md) and this file are up to date, including known limitations

## Known limitations (current)

- **No offline support:** reloading without a connection fails. Considered in Phase 8 and deferred: a service worker adds a real risk of visitors being stuck on an old version, and repeat visits are already fast because the model and app files are cached for 30 days and a year respectively. Worth revisiting if classroom use with poor Wi-Fi comes up.
- **Light theme only.**
- **Small-data accuracy:** with ~20 images per class, unusual photos can be misclassified confidently. One sample test photo (a tinted daisy close-up) often is. See [MODEL.md](MODEL.md).
- **Large imports** (thousands of images) work but take a while on phones; the limits are 300 images per class and 3,000 per import.
