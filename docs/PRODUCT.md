# Teachable: Product Spec (v1)

**One line:** train an image classifier in your browser in a couple of minutes. No code, no account, your images never leave your device, and you can take the model with you.

## Problem
People learning or prototyping with ML want to see how "training a model" works with their own images. Existing options need code (Python notebooks), an account, or uploading photos to someone's server.

## Target users
- **Learners and teachers:** students, workshop leaders and classrooms exploring what a classifier is and how data quality affects it.
- **Makers and prototypers:** people who need a quick custom image classifier for a side project or demo, and want to export it.

Not for: production ML teams, object detection, or large datasets (thousands of images per class).

## Core journey
1. **Land.** One sentence on what it does, plus two buttons: **Start a project** and **Try a sample project**.
2. **Make classes.** Start with two named classes and add or rename up to 10.
3. **Add images.** For each class: pick files, drag and drop images, or drop a whole folder. **Or import a .zip** with one folder per class, and the classes are created automatically. A wrapping top-level folder is handled, so "Compress folder" on macOS or Windows works. On phones, the system picker also offers "Take Photo".
4. **Train.** One button. A checklist shows what's missing ("Class 2 needs 5+ images"), then a progress bar, then the accuracy on held-back images.
5. **Test.** Drop one or more new images. Each gets a result card with a confidence bar per class. Below 60% confidence the card says **"Not sure"** instead of a label.
6. **Keep it.** The project saves automatically in this browser. **Export** downloads a ready-to-use TF.js model plus labels, with a copy-paste code snippet. A project file can be imported later.

## v1 scope

| In | Out (not in v1) |
|---|---|
| Classes: add, rename, delete; per-class sample count and thumbnails | Webcam capture and live prediction (dropped 2026-11-27) |
| Image input: file picker, drag-and-drop, folder drop, zip import | Accounts, cloud storage, sharing links |
| Dataset checklist: hard minimums, warnings for small or unbalanced classes | Audio, pose, text models |
| Training with progress and held-out accuracy | Hosted prediction API |
| Single and batch testing with confidence and "Not sure" | Data augmentation controls, hyperparameter UI |
| Auto-save to IndexedDB; export model; import/export project | Object detection or localisation |
| Sample project for first-time users | Multi-language UI |
| Clear empty, loading and error states; mobile-friendly; keyboard accessible | |

## What makes it useful rather than a demo
- **Zip and folder import** handles the messy reality of how people store images. The old version broke on the most common zip layout.
- **"Not sure", plus a confidence bar for every class**, shows how confident the model is instead of hiding it.
- **The guidance checklist** teaches better data habits: more variety, balanced classes.
- **Export** means the model can actually be used somewhere else.
- **Privacy by design:** nothing leaves the device, which makes it safe to use with classroom or personal photos.

## Success criteria for v1
- A new visitor can go from landing to a first correct prediction with the sample project in **under 2 minutes**, with no instructions beyond the page.
- The full journey works on recent Chrome, Safari, Firefox and Edge on desktop, plus iOS Safari and Android Chrome.
- There are no dead ends: every error tells the user what to do next.

## Limitations to state openly in the app
- The model only knows your classes. An unrelated image still gets spread across them. "Not sure" helps, but it isn't a guarantee.
- It learns whatever differs between your classes, including background and lighting.
- Accuracy depends mostly on how varied and representative your images are. See [MODEL.md](MODEL.md).

## Open questions
1. **Sample project content.** I recommend about 3 classes × 20 small images, around 1 MB total. Options: openly licensed photos (for example a subset of TensorFlow's CC-BY flower photos, with attribution) or photos you take yourself.
2. **Name and branding.** "Teachable" is a working name, and it's close to Google's product name. A distinct name should be chosen before public launch.
3. **Domain.** A custom domain, or the free `*.pages.dev` subdomain.
