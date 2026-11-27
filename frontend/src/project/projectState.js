/**
 * Project state, as a pure reducer so it's easy to test and reason about.
 *
 * Sample: { id, thumb: Blob, embedding: Float32Array }
 * Class:  { id, name, samples: Sample[] }
 * `revision` increases on every change; a trained model remembers the revision it was
 * trained on, so the UI can tell when it's out of date.
 */

export const MAX_CLASSES = 10;

/**
 * One colour per class, kept for the class's lifetime (so deleting a class doesn't recolour
 * the others). All are ≥3:1 against white for bars and stripes; they're never used for text.
 */
export const CLASS_COLORS = [
  '#2563EB',
  '#D9480F',
  '#0F8A5F',
  '#7C3AED',
  '#C2185B',
  '#0E7490',
  '#B7791F',
  '#5F7F12',
  '#8D5A2B',
  '#52606D',
];

export function nextColor(classes) {
  const used = new Set(classes.map((c) => c.color));
  const free = CLASS_COLORS.findIndex((_, i) => !used.has(i));
  return free === -1 ? classes.length % CLASS_COLORS.length : free;
}
export const MAX_CLASS_NAME = 40;

export const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const newClass = (name, classes, samples = []) => ({
  id: createId(),
  name,
  color: nextColor(classes),
  samples,
});

export function defaultClassName(classes) {
  const taken = new Set(classes.map((c) => c.name));
  let n = classes.length + 1;
  while (taken.has(`Class ${n}`)) n++;
  return `Class ${n}`;
}

export function initialProject() {
  const first = newClass('Class 1', []);
  return { classes: [first, newClass('Class 2', [first])], revision: 0, source: null };
}

function mapClass(state, id, fn) {
  return state.classes.map((c) => (c.id === id ? fn(c) : c));
}

export function projectReducer(state, action) {
  const next = (changes) => ({ ...state, ...changes, revision: state.revision + 1 });
  switch (action.type) {
    case 'addClass':
      if (state.classes.length >= MAX_CLASSES) return state;
      return next({
        classes: [...state.classes, newClass(action.name ?? defaultClassName(state.classes), state.classes)],
      });
    case 'renameClass':
      return next({
        classes: mapClass(state, action.id, (c) => ({ ...c, name: action.name.slice(0, MAX_CLASS_NAME) })),
      });
    case 'removeClass':
      return next({ classes: state.classes.filter((c) => c.id !== action.id) });
    case 'addSamples':
      if (!action.samples.length) return state;
      return next({
        classes: mapClass(state, action.id, (c) => ({ ...c, samples: [...c.samples, ...action.samples] })),
      });
    case 'removeSample':
      return next({
        classes: mapClass(state, action.id, (c) => ({
          ...c,
          samples: c.samples.filter((s) => s.id !== action.sampleId),
        })),
      });
    case 'clearClass':
      return next({ classes: mapClass(state, action.id, (c) => ({ ...c, samples: [] })) });
    case 'importClasses': {
      // Merge by name into existing classes; create the rest. Empty default classes are
      // dropped first so importing into a fresh project doesn't leave "Class 1/2" behind.
      let classes = action.replace
        ? []
        : state.classes.filter((c) => c.samples.length > 0 || !isDefaultName(c.name));
      for (const incoming of action.classes) {
        const name = incoming.name.slice(0, MAX_CLASS_NAME);
        const existing = classes.find((c) => c.name === name);
        if (existing) {
          classes = classes.map((c) =>
            c === existing ? { ...c, samples: [...c.samples, ...incoming.samples] } : c,
          );
        } else if (classes.length < MAX_CLASSES) {
          classes = [...classes, newClass(name, classes, incoming.samples)];
        }
      }
      while (classes.length < 2) classes = [...classes, newClass(defaultClassName(classes), classes)];
      return next({ classes, source: action.source ?? state.source });
    }
    case 'load': {
      // Projects saved before colours existed get them assigned now.
      const classes = [];
      for (const c of action.project.classes) {
        classes.push(Number.isInteger(c.color) ? c : { ...c, color: nextColor(classes) });
      }
      return { classes, revision: action.project.revision, source: action.project.source ?? null };
    }
    case 'reset':
      return { ...initialProject(), revision: state.revision + 1 };
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
}

const isDefaultName = (name) => /^Class \d+$/.test(name);
