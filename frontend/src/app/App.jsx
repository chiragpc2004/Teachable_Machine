import { useEffect, useReducer, useRef, useState } from 'react';
import { validateDataset } from '../ml/index.js';
import { collectFileList, expandZips, itemsToClasses } from '../project/datasetImport.js';
import { downloadBytes } from '../project/download.js';
import { exportProjectFile, importProjectFile, isProjectFile } from '../project/projectFile.js';
import { MAX_CLASSES, createId, initialProject, projectReducer } from '../project/projectState.js';
import { loadProject, saveProject } from '../project/storage.js';
import ClassCard from '../ui/ClassCard.jsx';
import ImportPanel from '../ui/ImportPanel.jsx';
import TestPanel from '../ui/TestPanel.jsx';
import TrainPanel from '../ui/TrainPanel.jsx';
import { SAMPLE_CREDITS_URL, loadSampleProject, loadSampleTestImages } from './sampleProject.js';
import { useEngine } from './useEngine.js';

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
          text: "Couldn't save your project in this browser (storage may be full or blocked). Use Export project to keep a copy.",
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
    setNotice({ kind: 'ok', text: `Opened project with ${classes.length} classes. Train to use it.` });
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
        text: 'Sample project loaded: 3 kinds of flowers, 20 photos each. Press Train model.',
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

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1>Teachable</h1>
          <p>Train an image classifier in your browser. Your images never leave this device.</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn--ghost btn--small" onClick={newProject} disabled={busy}>
            New project
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={exportProject}
            disabled={busy || totalSamples === 0}
          >
            Export project
          </button>
        </div>
      </header>

      <p className={`model-status model-status--${engine.status.state}`} role="status">
        {engine.status.state === 'loading' && 'Loading image model…'}
        {engine.status.state === 'ready' &&
          (loaded ? `Image model ready (${engine.status.backend})` : 'Restoring your project…')}
        {engine.status.state === 'error' && engine.status.message}
      </p>

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
              className="btn btn--ghost btn--small"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <main className="layout">
        <ImportPanel
          disabled={busy}
          showIntro={loaded && totalSamples === 0}
          onItems={importItems}
          onError={showError}
          onTrySample={trySample}
        />

        <section aria-labelledby="classes-title">
          <h2 id="classes-title">1. Add examples for each class</h2>
          <div className="class-list">
            {project.classes.map((c) => (
              <ClassCard
                key={c.id}
                cls={c}
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
              className="btn btn--ghost"
              onClick={() => dispatch({ type: 'addClass' })}
              disabled={busy}
            >
              + Add a class
            </button>
          )}
        </section>

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
          onLoadSampleTests={project.source === 'sample' ? loadSampleTestImages : null}
          onError={showError}
        />
      </main>

      <footer className="footer">
        <p>
          Everything runs on your device; nothing is uploaded. Projects are saved in this browser only.{' '}
          <a href={SAMPLE_CREDITS_URL} target="_blank" rel="noreferrer">
            Sample photo credits
          </a>
        </p>
      </footer>
    </div>
  );
}
