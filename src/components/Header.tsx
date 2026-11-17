import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LINKS, PROFILE } from '../data'
import { Icon, OrbitMark } from './shell/icons'
import { isMac, openPalette, trapTab } from './shell/focus'
import { lockScroll } from './shell/scrollLock'
import './shell.css'

const NAV = [
  { to: '/work', label: 'Work' },
  { to: '/experience', label: 'Experience' },
  { to: '/about', label: 'About' },
]

const SOCIALS = [
  { href: LINKS.github, label: 'GitHub' },
  { href: LINKS.linkedin, label: 'LinkedIn' },
  { href: LINKS.devpost, label: 'Devpost' },
]

const SCROLLED_AT = 12
const HIDE_AFTER = 400
const MOBILE_MQ = '(max-width: 767.98px)'

function useHeaderScroll() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const dy = y - lastY
      setScrolled(y > SCROLLED_AT)
      if (y < HIDE_AFTER) setHidden(false)
      else if (dy > 4) setHidden(true)
      else if (dy < -4) setHidden(false)
      lastY = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return { scrolled, hidden }
}

/** Positions the sliding indicator under the active nav link. */
function useIndicator(pathname: string) {
  const navRef = useRef<HTMLUListElement>(null)
  const [box, setBox] = useState<{ x: number; w: number } | null>(null)
  const [ready, setReady] = useState(false)

  const measure = useCallback(() => {
    const nav = navRef.current
    if (!nav) return
    const active = nav.querySelector<HTMLElement>('a[aria-current]')
    if (!active || active.getClientRects().length === 0) {
      setBox(null)
      return
    }
    // Inset to the label, not the padded hit area.
    const pad = parseFloat(getComputedStyle(active).paddingLeft) || 0
    setBox({ x: active.offsetLeft + pad, w: Math.max(1, active.offsetWidth - pad * 2) })
  }, [])

  useLayoutEffect(measure, [pathname, measure])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    let alive = true
    document.fonts?.ready.then(() => alive && measure())
    // Enable the slide only after the first placement so it doesn't fly in from 0.
    const id = requestAnimationFrame(() => setReady(true))
    return () => {
      alive = false
      ro.disconnect()
      cancelAnimationFrame(id)
    }
  }, [measure])

  return { navRef, box, ready }
}

export default function Header() {
  const { pathname } = useLocation()
  const { scrolled, hidden } = useHeaderScroll()
  const { navRef, box, ready } = useIndicator(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [mac, setMac] = useState(true)

  const headerRef = useRef<HTMLElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const lastPath = useRef(pathname)
  const menuOpenRef = useRef(menuOpen)
  menuOpenRef.current = menuOpen

  useEffect(() => setMac(isMac()), [])

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false)
    if (restoreFocus) toggleRef.current?.focus({ preventScroll: true })
  }, [])

  // Close the sheet on route change.
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    if (menuOpenRef.current) closeMenu()
  }, [pathname, closeMenu])

  // While open: lock scroll, Esc closes, Tab stays in header + sheet, close if viewport grows past mobile.
  useEffect(() => {
    if (!menuOpen) return
    const unlock = lockScroll()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.palette')) {
        e.preventDefault()
        closeMenu()
      } else if (e.key === 'Tab' && !document.querySelector('.palette')) {
        trapTab(e, headerRef.current, sheetRef.current)
      }
    }
    const mq = window.matchMedia(MOBILE_MQ)
    const onMq = () => !mq.matches && closeMenu(false)
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      unlock()
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [menuOpen, closeMenu])

  // The sheet stays mounted for its transition; keep it out of the tab order and AT tree when closed.
  useEffect(() => {
    if (sheetRef.current) sheetRef.current.inert = !menuOpen
  }, [menuOpen])

  const isHidden = hidden && !focusWithin && !menuOpen
  const cls = ['site-header', scrolled || menuOpen ? 'is-glass' : '', isHidden ? 'is-hidden' : '', menuOpen ? 'is-menu' : '']
    .filter(Boolean)
    .join(' ')

  const currentFor = (to: string) =>
    pathname === to ? 'page' : pathname.startsWith(`${to}/`) ? 'true' : undefined

  return (
    <>
      <header
        ref={headerRef}
        className={cls}
        onFocus={() => setFocusWithin(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false)
        }}
      >
        <div className="container site-header__inner">
          <Link to="/" className="wordmark" aria-current={pathname === '/' ? 'page' : undefined}>
            <OrbitMark className="wordmark__mark" />
            <span>{PROFILE.name}</span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            <ul ref={navRef} className="site-nav__list">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="site-nav__link" aria-current={currentFor(item.to)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <span
              aria-hidden="true"
              className={`site-nav__indicator${ready ? ' is-ready' : ''}${box ? ' is-on' : ''}`}
              style={box ? { transform: `translateX(${box.x}px) scaleX(${box.w})` } : undefined}
            />
          </nav>

          <div className="site-header__actions">
            <button type="button" className="cmdk-btn" aria-label="Open command menu" onClick={openPalette}>
              <Icon name="search" size={15} />
              <kbd className="cmdk-btn__keys">{mac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <a className="btn btn--primary header-email" href={LINKS.email}>
              Email
            </a>
            <button
              ref={toggleRef}
              type="button"
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
            >
              <span className="menu-toggle__bars" aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        ref={sheetRef}
        id="mobile-menu"
        className={`mobile-sheet${menuOpen ? ' is-open' : ''}`}
      >
        <div className="container mobile-sheet__inner">
          <nav aria-label="Mobile">
            <ul className="mobile-sheet__nav">
              <li>
                <Link to="/" className="mobile-sheet__link" aria-current={pathname === '/' ? 'page' : undefined}>
                  Home
                </Link>
              </li>
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="mobile-sheet__link" aria-current={currentFor(item.to)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mobile-sheet__foot">
            <a className="btn btn--primary mobile-sheet__email" href={LINKS.email}>
              Email {LINKS.emailAddress}
            </a>
            <ul className="mobile-sheet__socials">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a className="link" href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
