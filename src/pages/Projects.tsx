import { useReveal } from '../hooks'
import { PROJECTS } from '../data'

export default function Projects() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="page container" ref={ref}>
      <p className="page__crumb mono fade-up">~/projects</p>
      <h1 className="page__title fade-up">Projects</h1>
      <p className="page__lede fade-up">
        Selected work spanning applied machine learning, real-time systems, and
        published research. Each entry covers the problem, the technical
        approach, and the outcome.
      </p>

      <div className="entries">
        {PROJECTS.map((p, i) => (
          <article
            className="entry fade-up"
            key={p.name}
            style={{ transitionDelay: `${Math.min(i, 3) * 60}ms` }}
          >
            <div className="entry__head">
              <span className="entry__index mono">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="entry__head-main">
                <h2 className="entry__name">
                  {p.name}
                  {p.link && (
                    <a
                      className="entry__ext mono"
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      visit ↗
                    </a>
                  )}
                </h2>
                <p className="entry__tagline">{p.tagline}</p>
              </div>
            </div>

            {p.award && <p className="entry__award mono">{p.award}</p>}

            <h3 className="entry__label mono">// overview</h3>
            <p className="entry__overview">{p.overview}</p>

            <h3 className="entry__label mono">// technical implementation</h3>
            <ul className="entry__points">
              {p.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>

            {p.outcome && (
              <>
                <h3 className="entry__label mono">// outcome</h3>
                <p className="entry__overview">{p.outcome}</p>
              </>
            )}

            <div className="pills pills--sm entry__stack">
              {p.stack.map((t) => (
                <span className="pill pill--sm" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
