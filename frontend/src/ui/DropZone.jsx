import { useRef, useState } from 'react';
import { collectDropped } from '../project/datasetImport.js';

/**
 * Accepts dropped files, folders and zips. Calls onItems with [{ path, file }].
 * Errors while reading the drop are passed to onError.
 */
export default function DropZone({ onItems, onError, disabled, className = '', label, children }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0); // dragenter/leave fire for every child element

  const handlers = disabled
    ? {}
    : {
        onDragEnter: (e) => {
          e.preventDefault();
          depth.current++;
          setOver(true);
        },
        onDragOver: (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        },
        onDragLeave: () => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setOver(false);
        },
        onDrop: (e) => {
          e.preventDefault();
          e.stopPropagation();
          depth.current = 0;
          setOver(false);
          collectDropped(e.dataTransfer).then(onItems, onError);
        },
      };

  return (
    <div className={`dropzone ${over ? 'dropzone--over' : ''} ${className}`} {...handlers}>
      {children}
      {over && (
        <div className="dropzone__overlay" aria-hidden="true">
          {label}
        </div>
      )}
    </div>
  );
}
