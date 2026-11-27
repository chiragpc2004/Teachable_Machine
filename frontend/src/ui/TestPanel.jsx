import { useEffect, useRef, useState } from 'react';
import { CLASS_COLORS, createId } from '../project/projectState.js';
import { ACCEPTED_IMAGE_TYPES } from './accept.js';
import ConfidenceBars from './ConfidenceBars.jsx';
import DropZone from './DropZone.jsx';

const MAX_RESULTS = 24;
const pct = (x) => `${Math.round(x * 100)}%`;

export default function TestPanel({ ready, stale, predictFile, colorByLabel, onLoadSampleTests, onError }) {
  const [results, setResults] = useState([]); // { id, url, name, result?, error? }
  const [busy, setBusy] = useState(false);
  const urls = useRef(new Set());

  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function clear() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
    setResults([]);
  }

  async function run(files) {
    const images = files.filter((f) => f.type.startsWith('image/')).slice(0, MAX_RESULTS);
    if (!images.length) return;
    setBusy(true);
    const fresh = [];
    for (const file of images) {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      try {
        fresh.push({ id: createId(), url, name: file.name, result: await predictFile(file) });
      } catch (err) {
        fresh.push({ id: createId(), url, name: file.name, error: err.message });
      }
    }
    setResults((prev) => {
      const next = [...fresh, ...prev]; // newest batch first, in the order chosen
      next.slice(MAX_RESULTS).forEach((r) => {
        URL.revokeObjectURL(r.url);
        urls.current.delete(r.url);
      });
      return next.slice(0, MAX_RESULTS);
    });
    setBusy(false);
  }

  return (
    <DropZone
      className="panel-section"
      disabled={!ready || busy}
      label="Drop to test"
      onItems={(items) => run(items.map((i) => i.file))}
      onError={onError}
    >
      <section aria-labelledby="test-title">
        <h2 id="test-title" className="panel-section__title">
          <span className="step" aria-hidden="true">
            3
          </span>
          Test
        </h2>
        {!ready ? (
          <p className="muted small">After training, try the model on photos it hasn&rsquo;t seen.</p>
        ) : (
          <>
            {stale && (
              <p className="notice notice--warn small">Testing the previous model until you train again.</p>
            )}
            <div className="row">
              <label className={`btn btn--primary ${busy ? 'btn--disabled' : ''}`}>
                {busy ? 'Checking…' : 'Choose photos to test'}
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  multiple
                  disabled={busy}
                  className="visually-hidden"
                  onChange={(e) => {
                    const files = [...e.target.files];
                    e.target.value = '';
                    run(files);
                  }}
                />
              </label>
              {onLoadSampleTests && (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => onLoadSampleTests().then(run, (err) => onError(err))}
                >
                  Use sample test photos
                </button>
              )}
            </div>
            <p className="muted small">You can also drop photos here.</p>
          </>
        )}

        {results.length > 0 && (
          <>
            <ul className="results" aria-live="polite">
              {results.map((r) => (
                <li key={r.id} className={`result ${r.result?.uncertain ? 'result--unsure' : ''}`}>
                  <img src={r.url} alt={r.name} className="result__img" />
                  <div className="result__body">
                    {r.error ? (
                      <p className="notice notice--error small">{r.error}</p>
                    ) : (
                      <>
                        <p className="result__headline">
                          {r.result.uncertain ? (
                            <>
                              <span className="chip chip--unsure">Not sure</span>
                              <span className="muted small">
                                Leaning {r.result.ranked[0].label}, {pct(r.result.confidence)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span
                                className="chip"
                                style={{ '--class': CLASS_COLORS[colorByLabel[r.result.label] ?? 9] }}
                              >
                                {r.result.label}
                              </span>
                              <span className="muted small">{pct(r.result.confidence)} sure</span>
                            </>
                          )}
                        </p>
                        <ConfidenceBars ranked={r.result.ranked} colorByLabel={colorByLabel} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn--quiet btn--small" onClick={clear} disabled={busy}>
              Clear results
            </button>
          </>
        )}
      </section>
    </DropZone>
  );
}
