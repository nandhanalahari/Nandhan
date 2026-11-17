import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, type Project } from '../../data'
import { useCosmosStop, type Side } from '../../cosmos/journey'

/** Three numbers per world. When there are more to choose from, skip the one the award line already says. */
function pickMetrics(p: Project) {
  const pool = p.metrics.length > 3 ? p.metrics.filter((m) => m.value !== p.badge) : p.metrics
  return pool.slice(0, 3)
}

/**
 * One project, one world. Every project gets this exact template: same size,
 * same weight, text in the half of the screen the world leaves free.
 */
export default function World({ project: p, side }: { project: Project; side: Side }) {
  const ref = useRef<HTMLElement>(null)
  useCosmosStop(ref, p.slug, side, 0)

  const titleId = `${p.slug}-title`
  const external = p.links[0]
  const honor = p.award ?? p.venue

  return (
    <section
      ref={ref}
      id={p.slug}
      className={`stop stop--body-${side} world world--${p.slug}`}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="stop__col">
        <div className="stop__panel">
          <p className="award world__award">
            <span>
              {honor}
              {!honor.includes(p.year) && (
                <>
                  , <span className="data">{p.year}</span>
                </>
              )}
            </span>
          </p>
          <h2 id={titleId} className="world__name">
            {p.name}
          </h2>
          <p className="world__tagline">{p.tagline}</p>
          <p className="world__role">{p.role}</p>

          <dl className="world__metrics">
            {pickMetrics(p).map((m) => (
              <div key={m.label} className="world__metric">
                <dt className="world__label">{m.label}</dt>
                <dd className="world__value">{m.value}</dd>
              </div>
            ))}
          </dl>

          <ul className="world__stack" aria-label="Built with">
            {p.stack.slice(0, 5).map((s) => (
              <li key={s} className="tag">
                {s}
              </li>
            ))}
          </ul>

          <div className="world__links">
            <Link to={`/work/${p.slug}`} className="cta-link">
              Read the case study<span className="sr-only">: {p.name}</span>
            </Link>
            {external && (
              <a href={external.href} className="link world__external" target="_blank" rel="noopener noreferrer">
                {external.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const others = PROJECTS.filter((p) => !p.featured)

/** The projects without a world of their own, and the way to the full list. */
export function AlsoInOrbit() {
  return (
    <div className="also">
      <div className="also__bar">
        <p className="also__line">
          Also in orbit:{' '}
          {others.map((p, i) => (
            <span key={p.slug}>
              {i > 0 && ', '}
              <Link to={`/work/${p.slug}`} className="link">
                {p.name}
              </Link>{' '}
              <span className="muted">({p.award ?? p.venue})</span>
            </span>
          ))}
        </p>
        <Link to="/work" className="btn">
          All work
        </Link>
      </div>
    </div>
  )
}
