import { RECOMMENDED_SAMPLES_PER_CLASS } from '../ml/config.js';
import { CLASS_COLORS } from '../project/projectState.js';
import { ACCEPTED_IMAGE_TYPES } from './accept.js';
import DropZone from './DropZone.jsx';
import Thumb from './Thumb.jsx';

export default function ClassCard({
  cls,
  disabled,
  canRemove,
  onRename,
  onRemove,
  onAddFiles,
  onRemoveSample,
  onClear,
  onError,
  nameRef,
}) {
  const count = cls.samples.length;
  const progress = Math.min(1, count / RECOMMENDED_SAMPLES_PER_CLASS);
  const picker = (
    <label className={`btn btn--small ${disabled ? 'btn--disabled' : ''}`}>
      Add images
      <input
        type="file"
        accept={`${ACCEPTED_IMAGE_TYPES},.zip`}
        multiple
        disabled={disabled}
        className="visually-hidden"
        onChange={(e) => {
          const files = [...e.target.files];
          e.target.value = '';
          if (files.length) onAddFiles(files);
        }}
      />
    </label>
  );

  return (
    <DropZone
      className="class-card"
      disabled={disabled}
      label={`Add to ${cls.name || 'this class'}`}
      onItems={(items) => onAddFiles(items.map((i) => i.file))}
      onError={onError}
    >
      <section
        aria-label={`Class ${cls.name || 'unnamed'}`}
        style={{ '--class': CLASS_COLORS[cls.color ?? 0] }}
      >
        <header className="class-card__header">
          <span className="class-card__swatch" aria-hidden="true" />
          <input
            ref={nameRef}
            className="class-card__name"
            value={cls.name}
            onChange={(e) => onRename(e.target.value)}
            aria-label="Class name"
            maxLength={40}
            disabled={disabled}
            spellCheck={false}
          />
          {canRemove && (
            <button
              type="button"
              className="btn btn--quiet btn--small"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remove class ${cls.name}`}
            >
              Remove
            </button>
          )}
        </header>

        <div className="class-card__meter">
          <span className="count">
            {count} image{count === 1 ? '' : 's'}
          </span>
          <span className="meter" aria-hidden="true">
            <span style={{ width: `${progress * 100}%` }} />
          </span>
          <span className="muted small">
            {count >= RECOMMENDED_SAMPLES_PER_CLASS
              ? 'Good amount'
              : `${RECOMMENDED_SAMPLES_PER_CLASS}+ recommended`}
          </span>
        </div>

        {count === 0 ? (
          <div className="class-card__empty">
            <p>Drop photos of {cls.name ? <strong>{cls.name}</strong> : 'this class'} here, or</p>
            {picker}
          </div>
        ) : (
          <>
            <ul className="thumbs">
              {cls.samples.map((s) => (
                <li key={s.id}>
                  <Thumb blob={s.thumb} />
                  <button
                    type="button"
                    className="thumbs__remove"
                    onClick={() => onRemoveSample(s.id)}
                    aria-label="Remove image"
                    disabled={disabled}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="row class-card__actions">
              {picker}
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={onClear}
                disabled={disabled}
              >
                Remove all images
              </button>
            </div>
          </>
        )}
      </section>
    </DropZone>
  );
}
