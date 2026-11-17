import { useRef, type CSSProperties } from 'react'
import { PRINCIPLES } from '../../data'
import { useCosmosStop } from '../../cosmos/journey'
import { sideOf } from './stops'

/**
 * How high each star sits, in quarter steps of the hang zone (0 = top, 4 = bottom).
 * The same numbers place the stars and draw the lines between them.
 */
const HEIGHTS = [2, 0, 4, 1]
const heightOf = (i: number) => HEIGHTS[i % HEIGHTS.length]
const pct = (n: number) => `${n}%`

const segments = PRINCIPLES.slice(1).map((_, i) => ({
  x1: pct((i * 100) / PRINCIPLES.length),
  y1: pct(heightOf(i) * 25),
  x2: pct(((i + 1) * 100) / PRINCIPLES.length),
  y2: pct(heightOf(i + 1) * 25),
}))

/** A four-star constellation; each principle hangs from one of its stars. */
export default function Principles() {
  const ref = useRef<HTMLElement>(null)
  useCosmosStop(ref, 'principles', sideOf('principles'), 0.55)

  return (
    <section
      ref={ref}
      id="principles"
      className="stop stop--body-center principles"
      aria-labelledby="principles-title"
      tabIndex={-1}
    >
      <div className="stop__col">
        <div className="stop__panel">
          <header className="principles__head" data-reveal>
            <h2 id="principles-title" className="stop__title">
              How I work
            </h2>
            <p className="principles__lede muted">Four fixed points I steer by.</p>
          </header>

          <div className="principles__row">
            <svg className="principles__lines" aria-hidden="true" focusable="false">
              {segments.map((s) => (
                <line key={s.x1} {...s} />
              ))}
            </svg>
            {PRINCIPLES.map((p, i) => (
              <article key={p.title} className="principle" style={{ '--k': heightOf(i) } as CSSProperties}>
                <div className="principle__hang" aria-hidden="true">
                  <span className="principle__star" />
                  <span className="principle__thread" />
                </div>
                <h3 className="principle__title">{p.title}</h3>
                <p className="principle__body">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
