import { DEFAULT_CONFIDENCE_THRESHOLD } from '../ml/config.js';
import { CLASS_COLORS } from '../project/projectState.js';

const pct = (x) => `${Math.round(x * 100)}%`;

/**
 * One bar per class, in the class's colour, with a tick at the "Not sure" threshold so
 * people can see why a result was or wasn't confident enough.
 * @param {{ label: string, probability: number }[]} ranked
 * @param {Record<string, number>} colorByLabel colour index per class label
 */
export default function ConfidenceBars({ ranked, colorByLabel, threshold = DEFAULT_CONFIDENCE_THRESHOLD }) {
  return (
    <ul className="bars" style={{ '--threshold': pct(threshold) }}>
      {ranked.map((r) => (
        <li key={r.label} style={{ '--class': CLASS_COLORS[colorByLabel[r.label] ?? 9] }}>
          <span className="bars__label">{r.label}</span>
          <span
            className="bars__track"
            role="meter"
            aria-label={r.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(r.probability * 100)}
          >
            <span className="bars__fill" style={{ width: pct(r.probability) }} />
          </span>
          <span className="bars__value">{pct(r.probability)}</span>
        </li>
      ))}
    </ul>
  );
}
