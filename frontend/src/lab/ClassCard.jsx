import { useState } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_BYTES, MAX_SAMPLES_PER_CLASS } from './limits.js';

export default function ClassCard({
  cls,
  disabled,
  onRename,
  onRemove,
  onAddSamples,
  onRemoveSample,
  onClear,
  canRemove,
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleFiles(event) {
    const input = event.target;
    const files = [...input.files];
    input.value = ''; // allow re-selecting the same files
    if (!files.length) return;
    const room = MAX_SAMPLES_PER_CLASS - cls.samples.length;
    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES).length;
    const candidates = files.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, Math.max(0, room));
    setBusy(true);
    setNotice('');
    try {
      const { added, failed } = await onAddSamples(candidates);
      const notes = [];
      if (failed) notes.push(`${failed} file(s) couldn't be read as images`);
      if (tooBig) notes.push(`${tooBig} file(s) over ${MAX_FILE_BYTES / 1024 / 1024} MB were skipped`);
      if (files.length - tooBig > candidates.length)
        notes.push(`limit is ${MAX_SAMPLES_PER_CLASS} samples per class`);
      setNotice(notes.length ? `Added ${added}. ${notes.join('; ')}.` : '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card class-card" aria-label={`Class ${cls.name || 'unnamed'}`}>
      <header className="class-card__header">
        <input
          className="class-card__name"
          value={cls.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Class name"
          maxLength={40}
          disabled={disabled}
        />
        <span className="count" aria-live="polite">
          {cls.samples.length} sample{cls.samples.length === 1 ? '' : 's'}
        </span>
        {canRemove && (
          <button type="button" className="btn btn--ghost" onClick={onRemove} disabled={disabled}>
            Remove
          </button>
        )}
      </header>

      <div className="class-card__actions">
        <label className={`btn ${disabled || busy ? 'btn--disabled' : ''}`}>
          {busy ? 'Processing…' : 'Add images'}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            onChange={handleFiles}
            disabled={disabled || busy}
            className="visually-hidden"
          />
        </label>
        {cls.samples.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={onClear} disabled={disabled || busy}>
            Clear
          </button>
        )}
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {cls.samples.length === 0 ? (
        <p className="empty">
          No samples yet. Add photos that show this class from different angles and backgrounds.
        </p>
      ) : (
        <ul className="thumbs">
          {cls.samples.map((s) => (
            <li key={s.id}>
              <img src={s.url} alt="" width="56" height="56" />
              <button
                type="button"
                className="thumbs__remove"
                onClick={() => onRemoveSample(s.id)}
                aria-label="Remove sample"
                disabled={disabled}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
