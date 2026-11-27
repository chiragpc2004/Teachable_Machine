import { useEffect, useReducer, useRef, useState } from 'react';
import { validateDataset } from '../ml/dataset.js';
import { collectFileList, expandZips, itemsToClasses } from '../project/datasetImport.js';
import { downloadBytes } from '../project/download.js';
import { exportProjectFile, importProjectFile, isProjectFile } from '../project/projectFile.js';
import { MAX_CLASSES, createId, initialProject, projectReducer } from '../project/projectState.js';
import { loadProject, saveProject } from '../project/storage.js';
import ClassCard from '../ui/ClassCard.jsx';
import ImportPanel from '../ui/ImportPanel.jsx';
import Intro from '../ui/Intro.jsx';
import TestPanel from '../ui/TestPanel.jsx';
import TrainPanel from '../ui/TrainPanel.jsx';
import { SAMPLE_CREDITS_URL, loadSampleProject, loadSampleTestImages } from './sampleProject.js';
import { useEngine } from './useEngine.js';
import { APP_NAME, APP_VERSION, reportProblemUrl } from './brand.js';

export const MAX_SAMPLES_PER_CLASS = 300;

export default function App() {
  const engine = useEngine();
  const [project, dispatch] = useReducer(projectReducer, undefined, initialProject);
  const [loaded, setLoaded] = useState(false);
  const [model, setModel] = useState(null); // { labels, revision, validationAccuracy, trainedAt }
  const [training, setTraining] = useState(null); // { epoch, total } while training
  const [task, setTask] = useState(null); // { label, done, total } while processing images
  const [notice, setNotice] = useState(null); // { kind: 'ok' | 'warn' | 'error', text }
  const [exporting, setExporting] = useState(false);
  const loadStarted = useRef(false);
  const firstNameRef = useRef(null);

  const ready = engine.status.state === 'ready';
  const busy = !ready || !loaded || Boolean(task) || Boolean(training);
  const totalSamples = project.classes.reduce((n, c) => n + c.samples.length, 0);
  const stale = Boolean(model) && model.revision !== project.revision;

  // Restore the saved project and model once the image model is ready.
  useEffect(() => {
    if (!ready || loadStarted.current) return;
    loadStarted.current = true;
    (async () => {
      try {
        const saved = await loadProject();
        if (saved) {
          dispatch({ type: 'load', project: saved });
          const meta = await engine.restoreModel();
          if (meta) setModel(meta);
        } else {
          await engine.discardModel();
        }
      } catch (err) {
        console.warn('Could not restore saved project', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [ready, engine]);

  // Auto-save (debounced) after every change.
  useEffect(() => {
    if (!loaded) return undefined;
    const t = setTimeout(() => {
      saveProject(project).catch((err) => {
        console.warn(err);
        setNotice({
          kind: 'warn',
          text: "Couldn't save your project in this browser (storage may be full or blocked). Use Save project file to keep a copy.",
        });
      });
    }, 400);
    return () => clearTimeout(t);
  }, [project, loaded]);

  // Stop the browser from navigating to a file dropped outside a drop zone.
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const showError = (err) => setNotice({ kind: 'error', text: err.message ?? String(err) });

  async function embed(files, label) {
    setTask({ label, done: 0, total: files.length });
    try {
      const { samples, failures } = await engine.processFiles(files, (done, total) =>
        setTask({ label, done, total }),
      );
      return { samples: samples.map((s) => ({ id: createId(), ...s })), failures };
    } finally {
      setTask(null);
    }
  }

  function summarise(added, failures, extra = []) {
    const parts = [`Added ${added} image${added === 1 ? '' : 's'}.`];
    if (failures.length) parts.push(`${failures.length} couldn't be read (${failures[0]}).`);
    parts.push(...extra);
    setNotice({ kind: failures.length || extra.length ? 'warn' : 'ok', text: parts.join(' ') });
  }

  async function addFilesToClass(cls, files) {
    try {
      const images = (await collectFileList(files)).map((i) => i.file);
      const room = MAX_SAMPLES_PER_CLASS - cls.samples.length;
      const accepted = images.slice(0, Math.max(0, room));
      const extra =
        images.length > accepted.length ? [`Limit is ${MAX_SAMPLES_PER_CLASS} images per class.`] : [];
      if (!accepted.length) return summarise(0, [], extra);
      const { samples, failures } = await embed(accepted, `Adding images to ${cls.name}`);
      dispatch({ type: 'addSamples', id: cls.id, samples });
      summarise(samples.length, failures, extra);
    } catch (err) {
      showError(err);
    }
  }

  const confirmReplace = (what) =>
    totalSamples === 0 ||
    confirm(`${what} will replace your current project. Export it first if you want to keep it. Continue?`);

  async function resetModel() {
    setModel(null);
    await engine.discardModel();
  }

  async function importItems(items) {
    try {
      if (items.length === 1 && (await isProjectFile(items[0].file)))
        return await openProjectFile(items[0].file);
      const { classes, loose } = itemsToClasses(await expandZips(items));
      if (!classes.length) {
        throw new Error(
          loose
            ? "These images aren't inside class folders. Drop them onto a class instead, or use a zip/folder with one folder per class."
            : 'No images found. A dataset should contain one folder of images per class.',
        );
      }
      const extra = [];
      if (classes.length > MAX_CLASSES) extra.push(`Only the first ${MAX_CLASSES} classes were imported.`);
      if (loose) extra.push(`${loose} image(s) outside class folders were skipped.`);
      const incoming = [];
      let failuresAll = [];
      for (const cls of classes.slice(0, MAX_CLASSES)) {
        const files = cls.files.slice(0, MAX_SAMPLES_PER_CLASS);
        if (files.length < cls.files.length)
          extra.push(`"${cls.name}" was capped at ${MAX_SAMPLES_PER_CLASS} images.`);
        const { samples, failures } = await embed(files, `Importing "${cls.name}"`);
        incoming.push({ name: cls.name, samples });
        failuresAll = failuresAll.concat(failures);
      }
      dispatch({ type: 'importClasses', classes: incoming });
      summarise(
        incoming.reduce((n, c) => n + c.samples.length, 0),
        failuresAll,
        [`Classes: ${incoming.map((c) => c.name).join(', ')}.`, ...extra],
      );
    } catch (err) {
      showError(err);
    }
  }

  async function openProjectFile(file) {
    const classes = importProjectFile(new Uint8Array(await file.arrayBuffer()), engine.embeddingSize());
    if (!confirmReplace('Opening this project')) return;
    dispatch({
      type: 'importClasses',
      replace: true,
      classes: classes.map((c) => ({
        name: c.name,
        samples: c.samples.map((s) => ({ id: createId(), ...s })),
      })),
    });
    await resetModel();
    setNotice({
      kind: 'ok',
      text: `Opened project with ${classes.length} classes. Next, press Train model.`,
    });
  }

  async function trySample() {
    if (!confirmReplace('The sample project')) return;
    try {
      setTask({ label: 'Downloading sample images', done: 0, total: 0 });
      const { classes } = await loadSampleProject();
      const incoming = [];
      for (const cls of classes)
        incoming.push({ name: cls.name, ...(await embed(cls.files, `Preparing "${cls.name}"`)) });
      dispatch({ type: 'importClasses', replace: true, source: 'sample', classes: incoming });
      await resetModel();
      setNotice({
        kind: 'ok',
        text: 'Loaded 3 kinds of flowers with 20 photos each. Next, press Train model.',
      });
    } catch (err) {
      showError(err);
    } finally {
      setTask(null);
    }
  }

  async function newProject() {
    if (totalSamples > 0 && !confirm('Start a new project? Your current classes and model will be deleted.'))
      return;
    dispatch({ type: 'reset' });
    await resetModel();
    setNotice(null);
  }

  async function exportProject() {
    try {
      downloadBytes(await exportProjectFile(project.classes), 'teachable-project.zip');
    } catch (err) {
      showError(err);
    }
  }

  const validation = validateDataset(project.classes.map((c) => ({ name: c.name, count: c.samples.length })));

  async function train() {
    const used = project.classes
      .filter((c) => c.samples.length > 0)
      .map((c) => ({ name: c.name.trim(), embeddings: c.samples.map((s) => s.embedding) }));
    setTraining({ epoch: 0, total: 0 });
    setNotice(null);
    try {
      setModel(await engine.train(used, project.revision, (epoch, total) => setTraining({ epoch, total })));
    } catch (err) {
      console.error(err);
      setNotice({
        kind: 'error',
        text: 'Training failed. Try again, or reload the page if it keeps happening.',
      });
    } finally {
      setTraining(null);
    }
  }

  async function exportModel() {
    setExporting(true);
    try {
      downloadBytes(await engine.exportModel(), 'teachable-model.zip');
    } catch (err) {
      showError(err);
    } finally {
      setExporting(false);
    }
  }

  // Results are coloured like the class they name. Match by name, since that's what the model knows.
  const colorByLabel = Object.fromEntries(project.classes.map((c) => [c.name.trim(), c.color]));
  const firstVisit = loaded && totalSamples === 0;

  function startOwn() {
    firstNameRef.current?.focus();
    firstNameRef.current?.select();
    firstNameRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  const importPanel = (
    <ImportPanel disabled={busy} onItems={importItems} onError={showError} compact={!firstVisit} />
  );

  return (
    <div
      className="page"
      data-state={ready && loaded ? 'ready' : engine.status.state}
      data-backend={engine.status.backend ?? ''}
    >
      <header className="topbar">
        <span className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="24" height="24" />
          {APP_NAME}
        </span>
        <nav className="topbar__actions" aria-label="Project">
          <button type="button" className="btn btn--quiet btn--small" onClick={newProject} disabled={busy}>
            New project
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small"
            onClick={exportProject}
            disabled={busy || totalSamples === 0}
          >
            Save project file
          </button>
        </nav>
      </header>

      {engine.status.state === 'error' ? (
        <div className="fatal" role="alert">
          <h1>The image model didn&rsquo;t load</h1>
          <p>{engine.status.message}</p>
          <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
            Reload page
          </button>
        </div>
      ) : (
        <>
          {firstVisit && (
            <Intro disabled={busy} onTrySample={trySample} onStartOwn={startOwn} importSlot={importPanel} />
          )}

          <div className="status-line" role="status">
            {engine.status.state === 'loading' && (
              <span className="loading">
                Getting the image model ready (about 2 MB, faster after the first visit)…
              </span>
            )}
            {ready && !loaded && <span className="loading">Opening your saved project…</span>}
          </div>

          <div className="banners" aria-live="polite">
            {task && (
              <div className="banner">
                <span>
                  {task.label}
                  {task.total > 0 && `: ${task.done} of ${task.total}`}…
                </span>
                {task.total > 0 && <progress max={task.total} value={task.done} aria-label={task.label} />}
              </div>
            )}
            {notice && (
              <div
                className={`banner banner--${notice.kind}`}
                role={notice.kind === 'error' ? 'alert' : undefined}
              >
                <span>{notice.text}</span>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss message"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <main className="workspace">
            <section className="workspace__classes" aria-labelledby="classes-title">
              <h2 id="classes-title" className="section-title">
                <span className="step" aria-hidden="true">
                  1
                </span>
                Add example images for each class
              </h2>
              <div className="class-list">
                {project.classes.map((c, i) => (
                  <ClassCard
                    key={c.id}
                    cls={c}
                    nameRef={i === 0 ? firstNameRef : undefined}
                    disabled={busy}
                    canRemove={project.classes.length > 2}
                    onRename={(name) => dispatch({ type: 'renameClass', id: c.id, name })}
                    onRemove={() =>
                      (c.samples.length === 0 ||
                        confirm(`Remove "${c.name}" and its ${c.samples.length} images?`)) &&
                      dispatch({ type: 'removeClass', id: c.id })
                    }
                    onAddFiles={(files) => addFilesToClass(c, files)}
                    onRemoveSample={(sampleId) => dispatch({ type: 'removeSample', id: c.id, sampleId })}
                    onClear={() => dispatch({ type: 'clearClass', id: c.id })}
                    onError={showError}
                  />
                ))}
              </div>
              {project.classes.length < MAX_CLASSES && (
                <button
                  type="button"
                  className="btn btn--dashed btn--block"
                  onClick={() => dispatch({ type: 'addClass' })}
                  disabled={busy}
                >
                  + Add a class
                </button>
              )}
              {!firstVisit && importPanel}
            </section>

            <aside className="workspace__model" aria-label="Model">
              <TrainPanel
                validation={validation}
                canTrain={!busy && validation.ok}
                training={training}
                model={model}
                stale={stale}
                onTrain={train}
                onExport={exportModel}
                exporting={exporting}
              />
              <TestPanel
                key={model?.trainedAt ?? 'none'}
                ready={Boolean(model) && !training}
                stale={stale}
                predictFile={engine.predictFile}
                colorByLabel={colorByLabel}
                onLoadSampleTests={project.source === 'sample' ? loadSampleTestImages : null}
                onError={showError}
              />
              <details className="how">
                <summary>How does this work?</summary>
                <p>
                  A small image network called MobileNet, already trained on millions of photos, turns each of
                  your images into a list of 256 numbers describing what&rsquo;s in it. Training teaches a
                  tiny second network to tell your classes apart from those numbers, which is why a few dozen
                  examples are enough.
                </p>
                <p>
                  It learns whatever differs between your classes, including backgrounds and lighting, so use
                  varied photos. A photo of something that matches none of your classes still gets spread
                  across them; that&rsquo;s what &ldquo;Not sure&rdquo; is for.
                </p>
              </details>
              <details className="how">
                <summary>Where are my photos kept?</summary>
                <p>
                  Only on this device. Everything runs in your browser, and the page never sends your images
                  anywhere. To pick up where you left off, this browser keeps a small thumbnail of each image
                  and the numbers MobileNet produced for it, but not your original photos.
                </p>
                <p>
                  <strong>New project</strong> deletes all of it, and so does clearing this site&rsquo;s data
                  in your browser settings.
                </p>
              </details>
            </aside>
          </main>
        </>
      )}

      <footer className="footer">
        <p>
          Runs entirely on your device; nothing is uploaded. Your project is saved in this browser.{' '}
          <a href={SAMPLE_CREDITS_URL} target="_blank" rel="noreferrer">
            Sample photo credits
          </a>
        </p>
        <p>
          Version {APP_VERSION}.{' '}
          <a href={reportProblemUrl()} target="_blank" rel="noreferrer">
            Report a problem
          </a>
        </p>
      </footer>
    </div>
  );
}
