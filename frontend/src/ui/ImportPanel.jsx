import DropZone from './DropZone.jsx';

/** Bring a whole dataset in: a zip or folder with one folder per class, or a saved project. */
export default function ImportPanel({ disabled, onItems, onError, compact }) {
  return (
    <DropZone
      className={`import ${compact ? 'import--compact' : ''}`}
      disabled={disabled}
      label="Drop to import"
      onItems={onItems}
      onError={onError}
    >
      <p className="import__text">
        Already have images sorted into folders? Drop a .zip or folder with one folder per class, or a saved
        project file.
      </p>
      <div className="row">
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
    </DropZone>
  );
}
