import { Link } from 'react-router-dom'
import AsciiShapes from '../components/AsciiShapes'
import { useReveal } from '../hooks'
import {
  ANNOUNCEMENTS,
  HIGHLIGHTS,
  LINKS,
  PROJECTS,
  SKILL_GROUPS,
  iconUrl,
} from '../data'

function Hero() {
  return (
    <section className="hero container">
      <div className="hero__text">
        <h1 className="hero__title">Nandhan Alahari</h1>
        <p className="hero__lede">
          Hi, I'm Nandhan, a computer science student at UT Dallas, class of
          2028.
        </p>
        <p className="hero__body">
          I work on machine learning and research at the intersection of
          neuroscience and AI: decoding animal behavior from motion data,
          hardening software with ML-driven obfuscation, and teaching
          vision-language models to understand memes. A Rubik's cube got me
          into this. Watching my solve time fall from two minutes to forty
          seconds was my first lesson in what a better algorithm is worth.
        </p>
        <p className="hero__body">
          This site is where I share my projects, research, and whatever
          puzzle I'm currently taking apart.
        </p>
        <p className="hero__interests mono">
          Interests: Machine Learning <span>•</span> Neuroscience × AI{' '}
          <span>•</span> Systems
        </p>
        <div className="hero__links">
          <Link to="/about" className="chip-link">
            About me
          </Link>
          <a href={LINKS.email} className="chip-link">
            Email
          </a>
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="chip-link">
            GitHub
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="chip-link">
            LinkedIn
          </a>
        </div>
      </div>
      <div className="hero__art">
        <div className="art-box">
          <AsciiShapes />
        </div>
        <p className="hero__art-caption mono">// rendered from scratch, one char at a time</p>
      </div>
    </section>
  )
}

function Announcements() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="section container" ref={ref}>
      <h2 className="section__title fade-up">Announcements</h2>
      <div className="timeline">
        {ANNOUNCEMENTS.map((a, i) => (
          <article
            className="timeline__item fade-up"
            key={a.title}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <div className="timeline__dot" />
            <h3 className="timeline__title">{a.title}</h3>
            <p className="timeline__meta mono">
              {a.date}{' '}
              <span className={`badge badge--${a.kind.toLowerCase()}`}>{a.kind}</span>
            </p>
            <p className="timeline__body">{a.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Skills() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="section container" ref={ref}>
      <h2 className="section__title fade-up">Skills</h2>
      <div className="skills">
        {SKILL_GROUPS.map((g, i) => (
          <div
            className="skills__group fade-up"
            key={g.label}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <p className="skills__label">{g.label}</p>
            <div className="pills">
              {g.skills.map((s) => (
                <span className="pill" key={s.name}>
                  {s.icon && (
                    <img
                      src={iconUrl(s.icon)}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Highlights() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="section container" ref={ref}>
      <h2 className="section__title fade-up">Highlights</h2>
      <div className="stats fade-up">
        {HIGHLIGHTS.map((h) => (
          <div className="stats__card" key={h.label}>
            <p className="stats__value mono">{h.value}</p>
            <p className="stats__label">{h.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeaturedProjects() {
  const ref = useReveal<HTMLElement>()
  const featured = PROJECTS.slice(0, 3)
  return (
    <section className="section container" ref={ref}>
      <div className="section__row fade-up">
        <h2 className="section__title section__title--flush">Featured Projects</h2>
        <Link to="/projects" className="see-all mono">
          view all →
        </Link>
      </div>
      <div className="projects">
        {featured.map((p, i) => (
          <Link
            to="/projects"
            className="project fade-up"
            key={p.name}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <div className="pills pills--sm">
              {p.stack.slice(0, 4).map((t) => (
                <span className="pill pill--sm" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <h3 className="project__name">
              {p.name}
              <span className="project__arrow">→</span>
            </h3>
            <p className="project__tagline">{p.tagline}</p>
            {p.award && <p className="project__award mono">{p.award}</p>}
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Announcements />
      <Skills />
      <Highlights />
      <FeaturedProjects />
    </>
  )
}
