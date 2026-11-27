import DropZone from './DropZone.jsx';

/** One place to bring data in: dataset zip, folder of class folders, or a saved project. */
export default function ImportPanel({ disabled, onItems, onError, onTrySample, showIntro }) {
  return (
    <DropZone
      className="card import"
      disabled={disabled}
      label="Drop to import"
      onItems={onItems}
      onError={onError}
    >
      {showIntro && (
        <div className="import__intro">
          <h2>Get started</h2>
          <p>
            Make a class for each thing you want to recognise, add example images, then train. Or try a
            ready-made project first.
          </p>
          <button type="button" className="btn btn--primary" onClick={onTrySample} disabled={disabled}>
            Try the sample project (flowers)
          </button>
        </div>
      )}
      <div className="import__row">
        <p className="import__text">
          <strong>Import a dataset:</strong> drop a .zip or folder with <em>one folder per class</em>, or a
          saved project.
        </p>
        <div className="import__buttons">
          <label className={`btn btn--small ${disabled ? 'btn--disabled' : ''}`}>
            Choose .zip
            <input
              type="file"
              accept=".zip,application/zip"
              disabled={disabled}
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                e.target.value = '';
                if (file) onItems([{ path: file.name, file }]);
              }}
            />
          </label>
          <label className={`btn btn--small ${disabled ? 'btn--disabled' : ''}`}>
            Choose folder
            <input
              type="file"
              webkitdirectory=""
              multiple
              disabled={disabled}
              className="visually-hidden"
              onChange={(e) => {
                const files = [...e.target.files];
                e.target.value = '';
                if (files.length)
                  onItems(files.map((f) => ({ path: f.webkitRelativePath || f.name, file: f })));
              }}
            />
          </label>
        </div>
      </div>
    </DropZone>
  );
}
