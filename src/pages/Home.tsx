import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks'
import { useBooted } from '../boot'
import { FOCUS, LINKS, PRINCIPLES, ROLES, TIMELINE, WORK } from '../data'

const SECTIONS = [
  { id: 'journey', label: 'journey' },
  { id: 'focus', label: 'focus' },
  { id: 'work', label: 'work' },
  { id: 'approach', label: 'approach' },
  { id: 'contact', label: 'contact' },
]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

function useRotate(count: number, ms: number, active: boolean) {
  const [index, setIndex] = useState(0)
  const [locked, setLocked] = useState(false)
  useEffect(() => {
    if (!active || locked || reducedMotion()) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [active, locked, count, ms])
  const pick = (i: number) => {
    setLocked(true)
    setIndex(i)
  }
  return [index, pick] as const
}

function useTypedCycle(lines: string[]) {
  const [text, setText] = useState(reducedMotion() ? lines[0] : '')
  useEffect(() => {
    if (reducedMotion()) return
    let line = 0
    let pos = 0
    let deleting = false
    let id = 0
    const tick = () => {
      const target = lines[line]
      if (!deleting) {
        pos += 1
        setText(target.slice(0, pos))
        if (pos === target.length) {
          deleting = true
          id = window.setTimeout(tick, 1600)
          return
        }
        id = window.setTimeout(tick, 60)
      } else {
        pos -= 1
        setText(target.slice(0, pos))
        if (pos === 0) {
          deleting = false
          line = (line + 1) % lines.length
        }
        id = window.setTimeout(tick, 30)
      }
    }
    id = window.setTimeout(tick, 900)
    return () => window.clearTimeout(id)
  }, [lines])
  return text
}

function Console({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`console ${className}`}>
      <div className="console__bar">
        <span className="console__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="console__title mono">{title}</span>
      </div>
      <div className="console__body">{children}</div>
    </div>
  )
}

function SectionHead({ index, eyebrow, title, sub }: { index: string; eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="shead fade-up">
      <p className="eyebrow mono">
        {index} · {eyebrow}
      </p>
      <h2 className="shead__title">{title}</h2>
      {sub && <p className="shead__sub">{sub}</p>}
    </div>
  )
}

function Journey() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const [active, pick] = useRotate(TIMELINE.length, 5000, inView)
  const item = TIMELINE[active]
  return (
    <div className="journey fade-up" ref={ref}>
      <ol className="journey__rail" role="tablist" aria-label="Timeline">
        {TIMELINE.map((t, i) => (
          <li key={t.when}>
            <button
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`journey__stop${i === active ? ' is-active' : ''}`}
              onClick={() => pick(i)}
            >
              <span className="journey__when mono">{t.when}</span>
              <span className="journey__focus">{t.focus}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="journey__panel" role="tabpanel" key={item.when}>
        <p className="journey__tag mono">// {item.when.toLowerCase()}</p>
        <h3 className="journey__title">{item.focus.charAt(0).toUpperCase() + item.focus.slice(1)}</h3>
        <p className="journey__text">
          {item.lead} <strong>{item.focus}</strong>
          {item.rest}
        </p>
      </div>
    </div>
  )
}

function Focus() {
  const [ref, inView] = useInView<HTMLDivElement>()
  const [paused, setPaused] = useState(false)
  const [active, pick] = useRotate(FOCUS.length, 3600, inView && !paused)
  const area = FOCUS[active]
  return (
    <div className="focus fade-up" ref={ref} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <p className="focus__prompt mono">select a focus area</p>
      <div className="focus__chips" role="tablist" aria-label="Focus areas">
        {FOCUS.map((f, i) => (
          <button
            type="button"
            role="tab"
            aria-selected={i === active}
            key={f.id}
            className={`chip mono${i === active ? ' is-active' : ''}`}
            onClick={() => pick(i)}
          >
            {f.name}
          </button>
        ))}
      </div>
      <Console title={`console · focus/${area.id}`} className="focus__console">
        <div key={area.id} className="focus__content">
          <p className="focus__blurb">{area.blurb}</p>
          <ul className="focus__examples mono">
            {area.examples.map((e) => (
              <li key={e.label}>
                <span className={`focus__kind focus__kind--${e.kind}`}>{e.kind === 'project' ? '◆' : '⌘'}</span>
                <span className="focus__label">{e.kind}</span>
                <span>{e.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Console>
    </div>
  )
}

function Contact() {
  const [ref, inView] = useInView<HTMLDivElement>(0.4)
  const command = 'connect --with nandhan'
  const [typed, setTyped] = useState(reducedMotion() ? command.length : 0)
  useEffect(() => {
    if (!inView || typed >= command.length) return
    const id = window.setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 300 : 45)
    return () => window.clearTimeout(id)
  }, [inView, typed])
  const done = typed >= command.length
  const tiles = [
    { label: 'email', value: 'alahari.nandhan@gmail.com', href: LINKS.email },
    { label: 'linkedin', value: '/in/nandhan-alahari', href: LINKS.linkedin },
    { label: 'github', value: '/nandhanalahari', href: LINKS.github },
    { label: 'devpost', value: '/nandhu-alahari', href: LINKS.devpost },
  ]
  return (
    <div ref={ref}>
      <Console title="console · contact" className="contact__console">
        <p className="contact__cmd mono">
          <span className="term__prompt">&gt;</span> {command.slice(0, typed)}
          {!done && <span className="cursor-blink">▍</span>}
        </p>
        <div className={`contact__tiles${done ? ' is-shown' : ''}`}>
          {tiles.map((t) => (
            <a
              key={t.label}
              href={t.href}
              className="contact__tile mono"
              {...(t.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <span className="contact__key">{t.label}</span>
              <span className="contact__value">{t.value}</span>
            </a>
          ))}
        </div>
      </Console>
    </div>
  )
}

function StatusBar() {
  const [state, setState] = useState({ section: 'home', index: 0, pct: 0 })
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0
      let section = 'home'
      let index = 0
      SECTIONS.forEach((s, i) => {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) {
          section = s.label
          index = i + 1
        }
      })
      setState({ section, index, pct })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="statusbar mono" aria-hidden="true">
      <span>
        <b>section:</b> {state.section}
      </span>
      <span>
        <b>pos:</b> {String(state.index).padStart(2, '0')}/{String(SECTIONS.length).padStart(2, '0')}
      </span>
      <span>
        <b>scroll:</b> {state.pct}%
      </span>
    </div>
  )
}

const SESSION: { cmd: string; out: ReactNode }[] = [
  {
    cmd: 'whoami',
    out: (
      <>
        nandhan-alahari <span className="term__dim">· cs student @ ut dallas</span>
      </>
    ),
  },
  {
    cmd: 'status --now',
    out: (
      <>
        <span className="term__live" aria-hidden="true">
          ●
        </span>{' '}
        open to swe and ml roles
      </>
    ),
  },
  {
    cmd: 'ls ~/work',
    out: (
      <span className="term__cols">
        {WORK.map((w) => (
          <span key={w.name}>{w.name.toLowerCase()}</span>
        ))}
      </span>
    ),
  },
  {
    cmd: 'cat stack.txt',
    out: (
      <span className="term__cols">
        {['python', 'pytorch', 'fastapi', 'react', 'next.js', 'supabase'].map((s) => (
          <span key={s}>{s}</span>
        ))}
      </span>
    ),
  },
]

function HeroTerminal() {
  const booted = useBooted()
  const [pos, setPos] = useState({ line: 0, chars: 0 })

  useEffect(() => {
    if (!booted) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPos({ line: SESSION.length, chars: 0 })
      return
    }
    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      await sleep(500)
      for (let i = 0; i < SESSION.length; i++) {
        for (let c = 1; c <= SESSION[i].cmd.length; c++) {
          if (cancelled) return
          setPos({ line: i, chars: c })
          await sleep(45 + Math.random() * 45)
        }
        await sleep(240)
        if (cancelled) return
        setPos({ line: i + 1, chars: 0 })
        await sleep(380)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [booted])

  const cursor = <span className="cursor-blink">▍</span>
  const done = pos.line >= SESSION.length

  return (
    <Console title="console · ~/nandhan" className="hero__terminal">
      {SESSION.map((s, i) => (
        <div key={s.cmd}>
          <p className={i <= pos.line ? '' : 'term__pending'}>
            <span className="term__prompt">$</span> {i < pos.line ? s.cmd : i === pos.line ? s.cmd.slice(0, pos.chars) : s.cmd}
            {i === pos.line && cursor}
          </p>
          <p className={i < pos.line ? 'term__out' : 'term__pending'}>{s.out}</p>
        </div>
      ))}
      <p className={done ? '' : 'term__pending'}>
        <span className="term__prompt">$</span> {done && cursor}
      </p>
    </Console>
  )
}

export default function Home() {
  const ref = useReveal<HTMLDivElement>()
  const role = useTypedCycle(ROLES)
  return (
    <div ref={ref}>
      <section className="hero container">
        <div className="hero__text">
          <p className="eyebrow mono">cs @ ut dallas</p>
          <h1 className="hero__title">Nandhan Alahari</h1>
          <p className="hero__role mono">
            <span className="term__prompt">&gt;</span> {role}
            <span className="cursor-blink">▍</span>
          </p>

          <div className="hero__links">
            <a href={LINKS.email} className="btn btn--solid">
              Get in touch
            </a>
            <Link to="/projects" className="btn">
              View work ›
            </Link>
          </div>

        </div>

        <div className="hero__visual">
          <HeroTerminal />
          <Link to="/about" className="learn-more">
            Learn more about me →
          </Link>
        </div>
      </section>

      <section className="section container" id="journey">
        <SectionHead index="01" eyebrow="journey" title="From LEGO to research labs." />
        <Journey />
      </section>

      <section className="section container" id="focus">
        <SectionHead index="02" eyebrow="focus" title="Where I spend my time." />
        <Focus />
      </section>

      <section className="section container" id="work">
        <div className="shead-row">
          <SectionHead index="03" eyebrow="work" title="Selected work." sub="built for labs, clubs, and competitions" />
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
        <SectionHead index="04" eyebrow="approach" title="How I work." sub="the principles behind everything i build" />
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

      <section className="section container contact fade-up" id="contact">
        <SectionHead index="05" eyebrow="contact" title="Let's talk." sub="Open to software engineering and machine learning roles." />
        <Contact />
      </section>

      <StatusBar />
    </div>
  )
}
