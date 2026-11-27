/** Held-back sets smaller than this give a noticeably jumpy accuracy number. */
const ROUGH_BELOW = 30;

export default function TrainPanel({
  validation,
  canTrain,
  training,
  model,
  stale,
  onTrain,
  onExport,
  exporting,
}) {
  const isTraining = Boolean(training);
  const issues = validation.errors.length ? validation.errors : validation.warnings;
  return (
    <section className="panel-section" aria-labelledby="train-title">
      <h2 id="train-title" className="panel-section__title">
        <span className="step" aria-hidden="true">
          2
        </span>
        Train
      </h2>

      {issues.length > 0 && (
        <ul className={`checklist ${validation.errors.length ? '' : 'checklist--warn'}`}>
          {issues.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={onTrain}
        disabled={!canTrain || isTraining}
      >
        {isTraining ? 'Training…' : model ? 'Train again' : 'Train model'}
      </button>

      <div aria-live="polite">
        {isTraining && (
          <div className="training">
            <progress max={training.total || 1} value={training.epoch} aria-label="Training progress" />
            <span className="muted small">
              {training.total ? `Round ${training.epoch} of ${training.total}` : 'Starting…'}
            </span>
          </div>
        )}
        {model && !isTraining && !stale && (
          <div className="trained">
            <p className="trained__headline">Model trained</p>
            {model.validationAccuracy == null ? (
              <p className="muted small">Add more images to get an accuracy estimate.</p>
            ) : (
              <p className="small">
                Got <strong>{Math.round(model.validationAccuracy * 100)}%</strong> of{' '}
                {model.validationSize ?? 'the'} held-back images right.
                {(model.validationSize ?? 0) < ROUGH_BELOW && (
                  <span className="muted">
                    {' '}
                    With this few, treat it as a rough guide; testing below tells you more.
                  </span>
                )}
              </p>
            )}
          </div>
        )}
        {model && stale && !isTraining && (
          <p className="notice notice--warn small">
            Your classes changed since training. Train again to include them.
          </p>
        )}
      </div>

      {model && (
        <button
          type="button"
          className="btn btn--block"
          onClick={onExport}
          disabled={isTraining || stale || exporting}
        >
          {exporting ? 'Preparing download…' : 'Download model'}
        </button>
      )}
    </section>
  );
}
