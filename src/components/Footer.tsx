import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LINKS, PROFILE } from '../data'
import { usePrefersReducedMotion } from '../hooks'
import './shell.css'

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  hour: 'numeric',
  minute: '2-digit',
})

const isoFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Current time, re-rendered on each minute boundary. */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const tick = () => {
      const d = new Date()
      setNow(d)
      timer = window.setTimeout(tick, 60_000 - (d.getTime() % 60_000) + 50)
    }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50)
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

function dallasIso(d: Date) {
  const parts = Object.fromEntries(isoFormat.formatToParts(d).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

const FOOTER_LINKS = [
  { href: LINKS.email, label: 'Email', external: false },
  { href: LINKS.linkedin, label: 'LinkedIn', external: true },
  { href: LINKS.github, label: 'GitHub', external: true },
  { href: LINKS.devpost, label: 'Devpost', external: true },
]

/** These pages end on their own contact block, so the footer doesn't repeat the links. */
const ENDS_WITH_CONTACT = ['/', '/about']

export default function Footer() {
  const { pathname } = useLocation()
  const showLinks = !ENDS_WITH_CONTACT.includes(pathname)
  const now = useMinuteClock()
  const reduced = usePrefersReducedMotion()

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__signoff">
          <p className="site-footer__line">
            Built from scratch by {PROFILE.short}, <span>with React and Three.js.</span>
          </p>
          <p className="site-footer__clock">
            <span className="site-footer__pulse" aria-hidden="true" />
            <span>
              Dallas,{' '}
              <time className="data" dateTime={dallasIso(now)}>
                {timeFormat.format(now)}
              </time>
            </span>
          </p>
        </div>

        <div className="site-footer__base">
          <p className="muted">
            © {now.getFullYear()} {PROFILE.name}
          </p>
          {showLinks && (
            <ul className="site-footer__links">
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {l.label}
                    {l.external && <span className="sr-only"> (opens in a new tab)</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="site-footer__top" onClick={backToTop}>
            Back to top
          </button>
        </div>
      </div>
    </footer>
  )
}
