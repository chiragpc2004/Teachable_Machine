import { useRef, useState } from 'react';
import { validateDataset } from './ml/index.js';
import ClassCard from './lab/ClassCard.jsx';
import PredictionPanel from './lab/PredictionPanel.jsx';
import { useImageClassifier } from './lab/useImageClassifier.js';

let nextId = 1;
const newId = () => nextId++;
const newClass = (n) => ({ id: newId(), name: `Class ${n}`, samples: [] });
const MAX_CLASSES = 10;

export default function App() {
  const { extractorStatus, embedFile, train, predictFile } = useImageClassifier();
  const [classes, setClasses] = useState(() => [newClass(1), newClass(2)]);
  const [training, setTraining] = useState({ state: 'idle' });
  const datasetVersion = useRef(0);
  const [trainedVersion, setTrainedVersion] = useState(null);

  const modelReady = extractorStatus.state === 'ready';
  const isTraining = training.state === 'training';

  function updateClass(id, change, touchesSamples = false) {
    if (touchesSamples) datasetVersion.current++;
    setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, ...change(c) } : c)));
  }

  function revoke(samples) {
    samples.forEach((s) => URL.revokeObjectURL(s.url));
  }

  async function addSamples(id, files) {
    let failed = 0;
    const added = [];
    for (const file of files) {
      try {
        const embedding = await embedFile(file);
        added.push({ id: newId(), url: URL.createObjectURL(file), embedding });
      } catch (err) {
        console.warn(err.message);
        failed++;
      }
    }
    if (added.length) updateClass(id, (c) => ({ samples: [...c.samples, ...added] }), true);
    return { added: added.length, failed };
  }

  function removeClass(id) {
    datasetVersion.current++;
    setClasses((cs) => {
      revoke(cs.find((c) => c.id === id)?.samples ?? []);
      return cs.filter((c) => c.id !== id);
    });
  }

  const validation = validateDataset(classes.map((c) => ({ name: c.name, count: c.samples.length })));
  // Renaming also changes the labels, so names are part of what makes the model stale.
  const fingerprint = `${datasetVersion.current}|${classes.map((c) => c.name).join('|')}`;
  const hasModel = training.state === 'done';
  const stale = hasModel && trainedVersion !== fingerprint;

  async function handleTrain() {
    const snapshot = fingerprint;
    setTraining({ state: 'training', epoch: 0, total: 0 });
    try {
      const result = await train(
        classes.map((c) => ({ name: c.name.trim(), embeddings: c.samples.map((s) => s.embedding) })),
        (epoch, total) => setTraining({ state: 'training', epoch, total }),
      );
      setTraining({ state: 'done', ...result });
      setTrainedVersion(snapshot);
    } catch (err) {
      console.error(err);
      setTraining({
        state: 'error',
        message: 'Training failed. Try again, or reload the page if it keeps happening.',
      });
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <h1>Teachable</h1>
        <p>Train an image classifier in your browser. Your images never leave this device.</p>
        <p className={`model-status model-status--${extractorStatus.state}`} role="status">
          {extractorStatus.state === 'loading' && 'Loading image model…'}
          {extractorStatus.state === 'ready' && `Image model ready (${extractorStatus.backend})`}
          {extractorStatus.state === 'error' && extractorStatus.message}
        </p>
      </header>

      <main className="layout">
        <section aria-labelledby="classes-title">
          <h2 id="classes-title">1. Add examples for each class</h2>
          <div className="class-list">
            {classes.map((c) => (
              <ClassCard
                key={c.id}
                cls={c}
                disabled={!modelReady || isTraining}
                canRemove={classes.length > 2}
                onRename={(name) => updateClass(c.id, () => ({ name }))}
                onRemove={() => removeClass(c.id)}
                onAddSamples={(files) => addSamples(c.id, files)}
                onRemoveSample={(sid) =>
                  updateClass(
                    c.id,
                    (cl) => {
                      revoke(cl.samples.filter((s) => s.id === sid));
                      return { samples: cl.samples.filter((s) => s.id !== sid) };
                    },
                    true,
                  )
                }
                onClear={() =>
                  updateClass(
                    c.id,
                    (cl) => {
                      revoke(cl.samples);
                      return { samples: [] };
                    },
                    true,
                  )
                }
              />
            ))}
          </div>
          {classes.length < MAX_CLASSES && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setClasses((cs) => [...cs, newClass(cs.length + 1)])}
              disabled={isTraining}
            >
              + Add a class
            </button>
          )}
        </section>

        <section className="card" aria-labelledby="train-title">
          <h2 id="train-title">2. Train</h2>
          {validation.errors.length > 0 && (
            <ul className="checklist">
              {validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {validation.ok && validation.warnings.length > 0 && (
            <ul className="checklist checklist--warn">
              {validation.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleTrain}
            disabled={!modelReady || !validation.ok || isTraining}
          >
            {isTraining ? 'Training…' : hasModel ? 'Retrain model' : 'Train model'}
          </button>
          {isTraining && (
            <progress max={training.total || 1} value={training.epoch} aria-label="Training progress" />
          )}
          <div aria-live="polite">
            {training.state === 'done' && (
              <p className="notice notice--ok">
                Trained.{' '}
                {training.validationAccuracy == null
                  ? 'Not enough samples to measure accuracy.'
                  : `Accuracy on held-back samples: ${Math.round(training.validationAccuracy * 100)}%.`}
              </p>
            )}
            {training.state === 'error' && <p className="notice notice--error">{training.message}</p>}
          </div>
        </section>

        <PredictionPanel ready={hasModel} stale={stale} predictFile={predictFile} />
      </main>
    </div>
  );
}
