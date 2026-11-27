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
}) {
  const count = cls.samples.length;
  return (
    <DropZone
      className="card class-card"
      disabled={disabled}
      label={`Add to ${cls.name || 'this class'}`}
      onItems={(items) => onAddFiles(items.map((i) => i.file))}
      onError={onError}
    >
      <section aria-label={`Class ${cls.name || 'unnamed'}`}>
        <header className="class-card__header">
          <input
            className="class-card__name"
            value={cls.name}
            onChange={(e) => onRename(e.target.value)}
            aria-label="Class name"
            maxLength={40}
            disabled={disabled}
          />
          <span className="count">
            {count} sample{count === 1 ? '' : 's'}
          </span>
          {canRemove && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </button>
          )}
        </header>

        <div className="class-card__actions">
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
          {count > 0 && (
            <button type="button" className="btn btn--ghost btn--small" onClick={onClear} disabled={disabled}>
              Clear
            </button>
          )}
        </div>

        {count === 0 ? (
          <p className="empty">
            Drop images or a folder here, or use Add images. Varied angles and backgrounds work best.
          </p>
        ) : (
          <ul className="thumbs">
            {cls.samples.map((s) => (
              <li key={s.id}>
                <Thumb blob={s.thumb} />
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
    </DropZone>
  );
}
