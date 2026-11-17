import { useRef, type CSSProperties } from 'react'
import { EXPERIENCE, PROFILE, PUBLICATION, type Role } from '../data'
import { useCosmosStop } from '../cosmos/journey'
import { useTitle } from '../hooks'
import './profile.css'

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

const CURRENT = EXPERIENCE.filter((r) => r.current)

function RoleItem({ role }: { role: Role }) {
  const headingId = `role-${role.id}-title`
  return (
    <li id={`role-${role.id}`} className={`orbit__item${role.current ? ' is-current' : ''}`} aria-labelledby={headingId}>
      <span className="orbit__node" aria-hidden="true" />
      <div className="orbit__meta">
        <p className="orbit__when">
          {role.current && <span className="orbit__now">Now</span>}
          <span className="data">
            {role.start} – {role.end}
          </span>
        </p>
        <p className="orbit__org">{role.org}</p>
        <p className="orbit__where">{role.where}</p>
      </div>
      <div className="orbit__body">
        <h2 className="orbit__title" id={headingId}>
          {role.title}
        </h2>
        <p className="orbit__summary">{role.summary}</p>
        <ul className="orbit__bullets">
          {role.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <ul className="tags orbit__tags" aria-label="Tools and techniques">
          {role.tech.map((t) => (
            <li className="tag" key={t}>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

export default function Experience() {
  useTitle('Experience')
  const headRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // The young world and its moons hold beside the heading, then recede behind the timeline.
  useCosmosStop(headRef, 'now', 'right', 0.1)
  useCosmosStop(bodyRef, 'now', 'right', 0.8)

  const word = NUMBER_WORDS[CURRENT.length] ?? String(CURRENT.length)
  // The world in the scene has three moons; only draw the parallel while it holds.
  const moonsLine =
    CURRENT.length === 3 ? 'Three moons in orbit, one for each role I hold right now.' : `${word} roles running right now.`

  return (
    <div className="profile">
      <header ref={headRef} className="phero">
        <div className="container phero__inner">
          <h1 className="phero__title">Experience</h1>
          <p className="phero__lede">
            Research labs, student engineering teams, and a nonprofit client, each one shipping machine learning or
            software that someone depends on.
          </p>
          <div className="moons">
            <p className="moons__label" id="moons-label">
              {moonsLine}
            </p>
            <ul className="moons__list" aria-labelledby="moons-label">
              {CURRENT.map((r) => (
                <li key={r.id}>
                  <a className="moons__link" href={`#role-${r.id}`}>
                    <span className="moons__dot" aria-hidden="true" />
                    <span className="moons__title">{r.title}</span>
                    <span className="moons__org">{r.org}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <div ref={bodyRef} className="pbody">
        <section className="container orbit-wrap" aria-label="Roles, most recent first">
          <ol className="orbit">
            {EXPERIENCE.map((r) => (
              <RoleItem key={r.id} role={r} />
            ))}
          </ol>
        </section>

        <section className="container creds" aria-label="Education and publication">
          <div className="creds__grid">
            <article className="creds__block" aria-labelledby="edu-title" data-reveal>
              <h2 className="creds__label" id="edu-title">
                Education
              </h2>
              <div className="creds__body">
                <p className="creds__school">{PROFILE.school}</p>
                <p className="creds__detail">
                  {PROFILE.degree}, expected {PROFILE.grad}
                </p>
                <p className="creds__gpa">
                  <span className="creds__gpa-value data">{PROFILE.gpa}</span>
                  <span className="creds__gpa-label">cumulative GPA</span>
                </p>
              </div>
            </article>

            <article
              className="creds__block"
              aria-labelledby="pub-title"
              data-reveal
              style={{ '--reveal-delay': '120ms' } as CSSProperties}
            >
              <h2 className="creds__label" id="pub-title">
                Publication
              </h2>
              <div className="creds__body">
                <p className="creds__paper">
                  <a className="link" href={PUBLICATION.href} target="_blank" rel="noreferrer">
                    {PUBLICATION.title}
                    <span className="sr-only"> (opens ACL Anthology in a new tab)</span>
                  </a>
                </p>
                <p className="creds__detail">{PUBLICATION.venue}</p>
                <p className="creds__note">
                  Co-author. I built the data curation pipeline and the LoRA fine-tuning workflow behind a 9K+ question
                  benchmark for multimodal models.
                </p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}
