import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { HOME_STOPS, useActiveStop, type StopId } from '../../cosmos/journey'
import { goToStop } from './stops'

function onMarkerClick(e: MouseEvent<HTMLAnchorElement>, id: StopId) {
  // Leave modified clicks (new tab, new window) to the browser.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  goToStop(id)
}

/**
 * The flight path: one marker per stop on the right edge (>= 1024px), and a
 * slim progress line on smaller screens. `endRef` marks the end of the home
 * page; both fade out once the footer is in view.
 */
export default function JourneyRail({ endRef }: { endRef: RefObject<HTMLElement> }) {
  const active = useActiveStop()
  const activeIndex = Math.max(
    0,
    HOME_STOPS.findIndex((s) => s.id === active),
  )
  const [away, setAway] = useState(false)
  const railFill = useRef<HTMLSpanElement>(null)
  const barFill = useRef<HTMLSpanElement>(null)

  // Scroll progress along the stops, written straight to the two fills.
  useEffect(() => {
    let raf = 0
    let tops: number[] = []

    const measure = () => {
      tops = HOME_STOPS.map((s) => {
        const el = document.getElementById(s.id)
        return el ? el.getBoundingClientRect().top + window.scrollY : 0
      })
    }
    const update = () => {
      raf = 0
      const y = window.scrollY
      const last = tops.length - 1
      let p = last
      for (let i = 0; i < last; i++) {
        if (y < tops[i + 1]) {
          const span = tops[i + 1] - tops[i]
          p = i + (span > 0 ? Math.max(0, (y - tops[i]) / span) : 0)
          break
        }
      }
      const scale = `scaleY(${(last > 0 ? p / last : 0).toFixed(4)})`
      if (railFill.current) railFill.current.style.transform = scale
      if (barFill.current) barFill.current.style.transform = scale
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onResize = () => {
      measure()
      onScroll()
    }

    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    // Fonts and late layout move the sections without a resize event.
    const ro = 'ResizeObserver' in window ? new ResizeObserver(onResize) : null
    ro?.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  // Step aside for the footer.
  useEffect(() => {
    const end = endRef.current
    if (!end || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      ([entry]) => setAway(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(end)
    return () => io.disconnect()
  }, [endRef])

  return (
    <>
      <nav className={`rail${away ? ' is-away' : ''}`} aria-label="Journey">
        <span className="rail__track" aria-hidden="true">
          <span ref={railFill} className="rail__fill" />
        </span>
        <ol className="rail__list">
          {HOME_STOPS.map((s, i) => {
            const state = i === activeIndex ? ' is-active' : i < activeIndex ? ' is-passed' : ''
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`rail__link${state}`}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  onClick={(e) => onMarkerClick(e, s.id)}
                >
                  <span className="rail__label">{s.label}</span>
                  <span className="rail__dot" aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className={`journey-bar${away ? ' is-away' : ''}`} aria-hidden="true">
        <span ref={barFill} className="journey-bar__fill" />
      </div>
    </>
  )
}
