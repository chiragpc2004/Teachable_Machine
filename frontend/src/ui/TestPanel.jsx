import { useEffect, useRef, useState } from 'react';
import { createId } from '../project/projectState.js';
import { ACCEPTED_IMAGE_TYPES } from './accept.js';
import DropZone from './DropZone.jsx';

const MAX_RESULTS = 24;
const pct = (x) => `${Math.round(x * 100)}%`;

export default function TestPanel({ ready, stale, predictFile, onLoadSampleTests, onError }) {
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
      className="card"
      disabled={!ready || busy}
      label="Drop to test"
      onItems={(items) => run(items.map((i) => i.file))}
      onError={onError}
    >
      <section aria-labelledby="test-title">
        <h2 id="test-title">3. Test</h2>
        {!ready ? (
          <p className="empty">Train a model first, then try it on images it hasn't seen.</p>
        ) : (
          <>
            {stale && (
              <p className="notice notice--warn">
                Testing the previous model. Retrain to include your changes.
              </p>
            )}
            <div className="row">
              <label className={`btn btn--primary ${busy ? 'btn--disabled' : ''}`}>
                {busy ? 'Testing…' : 'Choose test images'}
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
                  Try sample test images
                </button>
              )}
              {results.length > 0 && (
                <button type="button" className="btn btn--ghost" onClick={clear} disabled={busy}>
                  Clear results
                </button>
              )}
            </div>
            <p className="hint">
              Or drop images here. Results below 60% confidence show as &ldquo;Not sure&rdquo;.
            </p>
          </>
        )}

        {results.length > 0 && (
          <ul className="results" aria-live="polite">
            {results.map((r) => (
              <li key={r.id} className="result">
                <img src={r.url} alt={r.name} className="result__img" />
                <div className="result__body">
                  {r.error ? (
                    <p className="notice notice--error">{r.error}</p>
                  ) : (
                    <>
                      <p className="result__headline">
                        {r.result.uncertain ? (
                          <>
                            Not sure{' '}
                            <span className="muted">
                              (best guess {r.result.ranked[0].label}, {pct(r.result.confidence)})
                            </span>
                          </>
                        ) : (
                          <>
                            <strong>{r.result.label}</strong>{' '}
                            <span className="muted">{pct(r.result.confidence)}</span>
                          </>
                        )}
                      </p>
                      <ul className="bars">
                        {r.result.ranked.map((x) => (
                          <li key={x.label}>
                            <span className="bars__label">{x.label}</span>
                            <span className="bars__track">
                              <span className="bars__fill" style={{ width: pct(x.probability) }} />
                            </span>
                            <span className="bars__value">{pct(x.probability)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DropZone>
  );
}
