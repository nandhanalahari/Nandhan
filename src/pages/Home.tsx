import { Link } from 'react-router-dom'
import RubiksCube from '../components/RubiksCube'
import { useReveal } from '../hooks'
import { LINKS, PRINCIPLES, TIMELINE, WORK } from '../data'

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="shead fade-up">
      <h2 className="shead__title">{title}</h2>
      <p className="shead__sub">{sub}</p>
    </div>
  )
}

export default function Home() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref}>
      <section className="hero container">
        <div className="hero__text">
          <p className="hero__kicker mono">CS @ UT Dallas</p>
          <h1 className="hero__title">Nandhan Alahari</h1>
          <p className="hero__lede">
            I build machine learning systems and the software around them.
          </p>

          <div className="hero__links">
            <a href={LINKS.email} className="btn btn--solid">
              Get in touch
            </a>
            <Link to="/projects" className="btn">
              View work ›
            </Link>
          </div>

          <div className="term" aria-label="terminal">
            <p>
              <span className="term__prompt">$</span> whoami
            </p>
            <p>
              nandhan-alahari <span className="term__dim">· cs student @ ut dallas</span>
            </p>
            <p>
              <span className="term__prompt">$</span> status --now
            </p>
            <p>
              <span className="term__live" aria-hidden="true">●</span> open to swe and ml roles
            </p>
          </div>

          <Link to="/about" className="learn-more">
            Learn more about me →
          </Link>
        </div>

        <div className="hero__cube">
          <RubiksCube />
          <p className="hero__note">
            my first solve took over two minutes. now it takes 40 seconds.
          </p>
        </div>
      </section>

      <section className="section container" id="timeline">
        <SectionHead title="how i got here" sub="from LEGO sets to research labs" />
        <div className="ages">
          {TIMELINE.map((t) => (
            <article className="age fade-up" key={t.when}>
              <p className="age__when mono">{t.when}</p>
              <p className="age__text">
                {t.lead} <strong>{t.focus}</strong>
                {t.rest}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section container" id="work">
        <div className="shead-row">
          <SectionHead title="selected work" sub="built for labs, clubs, and competitions" />
          <Link to="/projects" className="see-all mono">
            all projects ›
          </Link>
        </div>
        <div className="cards">
          {WORK.map((w) => (
            <Link to={w.to} className="card fade-up" key={w.name}>
              <p className="card__meta mono">{w.meta}</p>
              <h3 className="card__name">{w.name}</h3>
              <p className="card__line">{w.line}</p>
              <div className="card__tags mono">
                {w.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <p className="card__status mono">
                <span className="card__dot" aria-hidden="true" />
                {w.status}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" id="approach">
        <SectionHead title="how i work" sub="the principles behind everything i build" />
        <div className="info-grid info-grid--two">
          {PRINCIPLES.map((p, i) => (
            <article className="info fade-up" key={p.title}>
              <p className="info__label mono">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="info__title">{p.title}</h3>
              <p className="info__body">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section container connect fade-up" id="connect">
        <h2 className="connect__title">get in touch</h2>
        <p className="connect__sub">
          Open to software engineering and machine learning roles.
          Email is the fastest way to reach me.
        </p>
        <div className="hero__links connect__links">
          <a href={LINKS.email} className="btn btn--solid">
            Email me
          </a>
          <a href={LINKS.resume} target="_blank" rel="noreferrer" className="btn">
            Resume
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="btn">
            LinkedIn
          </a>
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="btn">
            GitHub
          </a>
        </div>
      </section>
    </div>
  )
}
