import { useRef, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PROJECTS, projectBySlug, type Project } from '../data'
import { useCosmosStop } from '../cosmos/journey'
import { useTitle } from '../hooks'
import WeekReplay from '../components/WeekReplay/WeekReplay'
import NotFound from './NotFound'
import './work.css'

export default function CaseStudy() {
  const { slug } = useParams()
  const project = projectBySlug(slug)
  if (!project) return <NotFound />
  return <CaseStudyView key={project.slug} project={project} />
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="cs-sec" aria-labelledby={id}>
      <div className="cs-sec__head">
        <h2 id={id} className="cs-label">
          {title}
        </h2>
      </div>
      <div className="cs-sec__body">{children}</div>
    </section>
  )
}

function CaseStudyView({ project: p }: { project: Project }) {
  useTitle(p.name)
  const heroRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // The project's world holds on the right of the hero, then recedes behind the article.
  useCosmosStop(heroRef, p.slug, 'right', 0)
  useCosmosStop(bodyRef, p.slug, 'right', 0.8)

  const i = PROJECTS.findIndex((x) => x.slug === p.slug)
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length]
  const next = PROJECTS[(i + 1) % PROJECTS.length]
  const isRouter = p.slug === 'dc-router'

  return (
    <article className="cs">
      <header ref={heroRef} className="cs-hero">
        <div className="container cs-hero__inner">
          <dl className="cs-hero__facts">
            <div>
              <dt>Built at</dt>
              <dd>{p.venue}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd className="data">{p.year}</dd>
            </div>
          </dl>
          <h1 className="cs-hero__name">{p.name}</h1>
          <p className="cs-hero__tagline">{p.tagline}</p>
          {p.award && <p className="award cs-hero__award">{p.award}</p>}
          {p.links.length > 0 && (
            <ul className="cs-hero__links">
              {p.links.map((l, k) => (
                <li key={l.href}>
                  <a
                    className={`btn${k === 0 ? ' btn--primary' : ''}`}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div ref={bodyRef} className="cs-body">
        <div className="container cs-brief">
          <div className="cs-brief__main">
            <Section id="cs-problem" title="The problem">
              <p className="cs-lead">{p.problem}</p>
            </Section>

            <Section id="cs-role" title="What I built">
              <p className="cs-role">{p.role}</p>
            </Section>

            <Section id="cs-how" title="How it works">
              <ol className="cs-steps">
                {p.approach.map((a) => (
                  <li key={a.title} className="cs-step">
                    <h3 className="cs-step__title">{a.title}</h3>
                    <p className="cs-step__body">{a.body}</p>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <aside className="cs-rail" aria-label={`${p.name} at a glance`}>
            <div className="cs-rail__panel surface">
              <section className="cs-rail__sec" aria-labelledby="cs-results">
                <h2 id="cs-results" className="cs-label">
                  Results
                </h2>
                <dl className={`cs-metrics cs-metrics--${p.metrics.length % 2 === 0 ? 'even' : 'odd'}`}>
                  {p.metrics.map((m) => (
                    <div key={m.label} className="cs-metric">
                      <dt className="cs-metric__label">{m.label}</dt>
                      <dd className="cs-metric__value">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="cs-rail__sec" aria-labelledby="cs-stack">
                <h2 id="cs-stack" className="cs-label">
                  Stack
                </h2>
                <ul className="cs-stack" aria-label={`${p.name} stack`}>
                  {p.stack.map((s) => (
                    <li key={s} className="tag">
                      {s}
                    </li>
                  ))}
                </ul>
                {p.team && <p className="cs-team">{p.team}</p>}
              </section>
            </div>
          </aside>
        </div>

        {isRouter && (
          <section className="cs-replay" aria-labelledby="cs-replay-title">
            <div className="container">
              <div className="cs-replay__head">
                <h2 id="cs-replay-title" className="cs-replay__title">
                  Replay the week
                </h2>
                <p className="muted cs-replay__lede">
                  The same seven days, planned two ways. Scrub through the week and watch where the as-soon-as-possible
                  schedule overheats the hall and what each plan costs.
                </p>
              </div>
              <figure className="cs-replay__figure">
                <div className="cs-replay__stage">
                  <WeekReplay variant="full" />
                </div>
                <figcaption className="cs-replay__caption muted">
                  Hour-by-hour replay of the demo week: optimized plan against ASAP, with zone temperatures against the
                  32&nbsp;°C limit and running cost at market GPU prices.
                </figcaption>
              </figure>
            </div>
          </section>
        )}

        {p.evaluation && (
          <section className="cs-eval" aria-labelledby="cs-eval">
            <div className="container cs-eval__inner">
              <div className="cs-eval__copy">
                <h2 id="cs-eval" className="cs-label">
                  Evaluation
                </h2>
                <h3 className="cs-eval__title">{p.evaluation.title}</h3>
                <p className="cs-eval__intro">{p.evaluation.intro}</p>
                <p className="cs-eval__caveat">
                  <span className="cs-eval__caveat-label">Caveat.</span> {p.evaluation.caveat}
                </p>
              </div>
              <dl className="cs-eval__rows surface">
                {p.evaluation.rows.map((r) => (
                  <div key={r.label} className="cs-eval__row">
                    <dt>{r.label}</dt>
                    <dd className="data">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <nav className="container cs-pager" aria-label="More projects">
          <Link to={`/work/${prev.slug}`} className="cs-pager__link cs-pager__link--prev">
            <span className="cs-pager__dir">Previous project</span>
            <span className="cs-pager__name">{prev.name}</span>
            <span className="cs-pager__tagline">{prev.tagline}</span>
          </Link>
          <Link to={`/work/${next.slug}`} className="cs-pager__link cs-pager__link--next">
            <span className="cs-pager__dir">Next project</span>
            <span className="cs-pager__name">{next.name}</span>
            <span className="cs-pager__tagline">{next.tagline}</span>
          </Link>
        </nav>
      </div>
    </article>
  )
}
