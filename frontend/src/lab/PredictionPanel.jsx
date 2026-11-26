import { useEffect, useState } from 'react';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '../ml/config.js';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_BYTES } from './limits.js';

export default function PredictionPanel({ ready, stale, predictFile }) {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function handleFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setResult(null);
    setError('');
    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is over ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      setResult(await predictFile(file, DEFAULT_CONFIDENCE_THRESHOLD));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="predict-title">
      <h2 id="predict-title">3. Test your model</h2>
      {!ready ? (
        <p className="empty">Train a model first, then try it on a new image.</p>
      ) : (
        <>
          {stale && <p className="notice">Your samples changed since training. Retrain to include them.</p>}
          <label className={`btn btn--primary ${busy ? 'btn--disabled' : ''}`}>
            {busy ? 'Predicting…' : 'Choose a test image'}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={handleFile}
              disabled={busy}
              className="visually-hidden"
            />
          </label>
        </>
      )}

      {preview && <img className="predict-preview" src={preview} alt="Image being classified" />}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="result" aria-live="polite">
          <p className="result__headline">
            {result.uncertain ? (
              <>
                Not sure. Best guess is <strong>{result.ranked[0].label}</strong> at {pct(result.confidence)}.
              </>
            ) : (
              <>
                <strong>{result.label}</strong> ({pct(result.confidence)} confident)
              </>
            )}
          </p>
          <ul className="bars">
            {result.ranked.map((r) => (
              <li key={r.label}>
                <span className="bars__label">{r.label}</span>
                <span className="bars__track">
                  <span className="bars__fill" style={{ width: pct(r.probability) }} />
                </span>
                <span className="bars__value">{pct(r.probability)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const pct = (x) => `${Math.round(x * 100)}%`;
