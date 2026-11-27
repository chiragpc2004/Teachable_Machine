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
  return (
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
      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onTrain}
          disabled={!canTrain || isTraining}
        >
          {isTraining ? 'Training…' : model ? 'Retrain model' : 'Train model'}
        </button>
        {model && (
          <button
            type="button"
            className="btn"
            onClick={onExport}
            disabled={isTraining || stale || exporting}
          >
            {exporting ? 'Preparing…' : 'Export model (.zip)'}
          </button>
        )}
      </div>
      {isTraining && (
        <progress max={training.total || 1} value={training.epoch} aria-label="Training progress" />
      )}
      <div aria-live="polite">
        {model && !isTraining && !stale && (
          <p className="notice notice--ok">
            Trained.{' '}
            {model.validationAccuracy == null
              ? 'Not enough samples to measure accuracy.'
              : `Accuracy on held-back samples: ${Math.round(model.validationAccuracy * 100)}%.`}
          </p>
        )}
        {model && stale && !isTraining && (
          <p className="notice notice--warn">
            Your classes changed since training. Retrain to include the changes.
          </p>
        )}
      </div>
    </section>
  );
}
