import { useCallback, useEffect, useRef, useState } from 'react';
import { MODEL_PATH } from '../ml/config.js';

const MODEL_URL = `${import.meta.env.BASE_URL}${MODEL_PATH}`;

function need(engineRef) {
  if (!engineRef.current) throw new Error('The image model is still loading.');
  return engineRef.current;
}

/**
 * React wrapper around the ML engine (./engine.js). The engine and TensorFlow.js are
 * imported dynamically, so they download in parallel with the first render instead of
 * blocking it.
 */
export function useEngine() {
  const engineRef = useRef(null);
  const [status, setStatus] = useState({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createEngine } = await import('./engine.js');
        const engine = await createEngine(MODEL_URL);
        if (cancelled) return engine.dispose();
        engineRef.current = engine;
        setStatus({ state: 'ready', backend: engine.backend });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus({
            state: 'error',
            message: 'The image model could not be loaded. Check your connection and reload the page.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Stable callbacks, so effects that depend on them don't re-run.
  const processFiles = useCallback((...args) => need(engineRef).processFiles(...args), []);
  const train = useCallback((...args) => need(engineRef).train(...args), []);
  const restoreModel = useCallback(() => need(engineRef).restoreModel(), []);
  const discardModel = useCallback(() => need(engineRef).discardModel(), []);
  const predictFile = useCallback((...args) => need(engineRef).predictFile(...args), []);
  const exportModel = useCallback(() => need(engineRef).exportModel(), []);
  const embeddingSize = useCallback(() => need(engineRef).embeddingSize, []);

  return { status, processFiles, train, restoreModel, discardModel, predictFile, exportModel, embeddingSize };
}
