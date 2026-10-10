import { useReveal } from '../hooks'
import { EDUCATION, EXPERIENCE } from '../data'

export default function Experience() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="page container" ref={ref}>
      <p className="page__crumb mono fade-up">~/experience</p>
      <h1 className="page__title fade-up">Experience</h1>
      <p className="page__lede fade-up">
        Research and engineering at UT Dallas: a campus RAG assistant, disaster
        imagery, cognitive tools for patients, neuroscience, software security,
        and multimodal NLP.
      </p>

      <div className="entries">
        {EXPERIENCE.map((e, i) => (
          <article
            className="entry fade-up"
            key={e.role}
            style={{ transitionDelay: `${Math.min(i, 3) * 60}ms` }}
          >
            <div className="entry__head">
              <span className="entry__index mono">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="entry__head-main">
                <h2 className="entry__name">{e.role}</h2>
                <p className="entry__meta mono">
                  {e.org} · {e.period}
                </p>
              </div>
            </div>

            <h3 className="entry__label mono">// context</h3>
            <p className="entry__overview">{e.summary}</p>

            <h3 className="entry__label mono">// contributions</h3>
            <ul className="entry__points">
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <div className="pills pills--sm entry__stack">
              {e.tech.map((t) => (
                <span className="pill pill--sm" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="edu fade-up">
        <div className="edu__main">
          <p className="entry__label mono">// education</p>
          <h3 className="edu__school">{EDUCATION.school}</h3>
          <p className="edu__degree">
            {EDUCATION.degree} · {EDUCATION.grad}
          </p>
          <p className="edu__gpa mono">GPA {EDUCATION.gpa}</p>
        </div>
        <div className="edu__coursework">
          <p className="skills__label">Relevant Coursework</p>
          <div className="pills">
            {EDUCATION.coursework.map((c) => (
              <span className="pill" key={c}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
