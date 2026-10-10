import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LINKS } from '../data'

const NAME = 'nandhan alahari'

function useTyped(text: string) {
  const [count, setCount] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 0,
  )
  useEffect(() => {
    if (count >= text.length) return
    const id = window.setTimeout(() => setCount((c) => c + 1), count === 0 ? 350 : 75)
    return () => window.clearTimeout(id)
  }, [count, text])
  return count
}

export default function Header() {
  const typed = useTyped(NAME)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className={`header${scrolled || open ? ' header--solid' : ''}`}>
      <div className="container header__inner">
        <Link to="/" className="header__logo mono" aria-label={NAME}>
          <span aria-hidden="true">{NAME.slice(0, typed)}</span>
          <span className="cursor-blink" aria-hidden="true">
            ▍
          </span>
        </Link>
        <nav className={`header__nav${open ? ' is-open' : ''}`}>
          <NavLink to="/about">about</NavLink>
          <NavLink to="/projects">work</NavLink>
          <NavLink to="/experience">experience</NavLink>
          <a href={LINKS.github} target="_blank" rel="noreferrer">
            github
          </a>
        </nav>
        <div className="header__right">
          <span className="header__status mono">
            <span className="header__dot" aria-hidden="true" />
            open to roles
          </span>
          <a href={LINKS.email} className="btn btn--solid btn--sm">
            Get in touch
          </a>
          <button
            type="button"
            className="header__toggle"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}
