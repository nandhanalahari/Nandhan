import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, PUBLICATION, type Project } from '../data'
import { cosmos, useCosmosPark } from '../cosmos/journey'
import { useTitle } from '../hooks'
import './work.css'

/** Fly the camera to a project's world while its row is hovered or focused. */
function glance(p: Project) {
  cosmos.glance(p.slug, 'right')
}

function release() {
  cosmos.glance(null)
}

/** Two headline numbers per row. The metric that only repeats the award is skipped. */
const headline = (p: Project) => p.metrics.filter((m) => m.value !== p.badge).slice(0, 2)

function WorkRow({ project }: { project: Project }) {
  const stats = headline(project)
  return (
    <li className="wrow" onMouseEnter={() => glance(project)} onMouseLeave={release}>
      <Link
        to={`/work/${project.slug}`}
        className="wrow__link"
        onFocus={() => glance(project)}
        onBlur={release}
      >
        <span className="wrow__year data">{project.year}</span>
        <span className="wrow__main">
          <span className="wrow__name">{project.name}</span>
          <span className="wrow__tagline">{project.tagline}</span>
          {project.award ? (
            <span className="award wrow__award">{project.award}</span>
          ) : (
            <span className="wrow__venue">{project.venue}</span>
          )}
        </span>
      </Link>
      {stats.length > 0 && (
        <dl className="wrow__stats">
          {stats.map((m) => (
            <div key={m.label} className="wrow__stat">
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <span className="wrow__line" aria-hidden="true" />
    </li>
  )
}

export default function Work() {
  useTitle('Work')
  useCosmosPark('system', 'center', 0.55)

  // Never leave the camera on a hovered world after navigating away.
  useEffect(() => release, [])

  return (
    <div className="work-page">
      <header className="page-head container work-head">
        <div className="work-head__copy">
          <h1 className="page-head__title">Work</h1>
          <p className="page-head__lede">
            Machine learning systems built for competitions, research labs, and student clubs, each one shipped
            on a deadline and measured afterward.
          </p>
        </div>
        <p className="work-head__hint">
          Every project is a world in the system behind this page.{' '}
          <span className="work-head__hover">Hover or focus one to fly there.</span>
        </p>
      </header>

      <section className="container work-index" aria-labelledby="work-index-title">
        <h2 id="work-index-title" className="sr-only">
          All projects
        </h2>
        <ol className="work-index__list">
          {PROJECTS.map((p) => (
            <WorkRow key={p.slug} project={p} />
          ))}
        </ol>
      </section>

      <section className="container work-research" aria-labelledby="work-research-title">
        <h2 id="work-research-title" className="work-research__title">
          Research
        </h2>
        <div className="work-research__paper">
          <p className="work-research__name">
            <a className="link" href={PUBLICATION.href} target="_blank" rel="noreferrer">
              {PUBLICATION.title}
              <span className="sr-only"> (opens ACL Anthology in a new tab)</span>
            </a>
          </p>
          <p className="work-research__venue">{PUBLICATION.venue}</p>
        </div>
        <p className="work-research__note">
          Co-authored with Dr. Vincent Ng’s Human Language Technology lab. I built the data curation pipeline and
          the LoRA fine-tuning workflow.{' '}
          <Link className="link" to="/work/memeqa">
            Read the case study
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
