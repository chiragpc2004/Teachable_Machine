import { CLASS_COLORS } from '../project/projectState.js';
import ConfidenceBars from './ConfidenceBars.jsx';

const EXAMPLE_IMAGE = `${import.meta.env.BASE_URL}samples/flowers/test/sunflowers-3.jpg`;
const EXAMPLE = [
  { label: 'Sunflowers', probability: 0.91 },
  { label: 'Daisy', probability: 0.08 },
  { label: 'Roses', probability: 0.01 },
];

/** First-visit introduction: what this does, shown with what a result actually looks like. */
export default function Intro({ disabled, onTrySample, onStartOwn, importSlot }) {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <div className="intro__text">
        <h1 id="intro-title" className="intro__title">
          Teach your computer to tell things apart.
        </h1>
        <p className="intro__lede">
          Give it a few examples of each thing, train for a few seconds, then show it new photos and see how
          sure it is. It all runs in your browser, so your photos are never uploaded.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={onTrySample}
            disabled={disabled}
          >
            Try it with flowers
          </button>
          <button type="button" className="btn btn--large" onClick={onStartOwn} disabled={disabled}>
            Use my own images
          </button>
        </div>
        {importSlot}
      </div>

      <figure className="intro__example" aria-label="Example of a result">
        <div className="example">
          <img
            src={EXAMPLE_IMAGE}
            alt="Two sunflowers in front of a blue wooden wall"
            width="320"
            height="240"
          />
          <div className="example__body">
            <p className="result__headline">
              <span className="chip" style={{ '--class': CLASS_COLORS[2] }}>
                Sunflowers
              </span>
              <span className="muted">91% sure</span>
            </p>
            <ConfidenceBars ranked={EXAMPLE} colorByLabel={{ Daisy: 0, Roses: 1, Sunflowers: 2 }} />
          </div>
        </div>
        <figcaption>
          An example result. The line on each bar marks 60%: below it, the app answers &ldquo;Not sure&rdquo;.
        </figcaption>
      </figure>
    </section>
  );
}
