import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Global one-shot reveal: any element with [data-reveal] fades in the first
 * time it enters the viewport. Mounted once in App; re-scans on route change.
 * Elements can stagger with style={{ '--reveal-delay': '120ms' }}.
 */
export function useRevealAll() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.documentElement.classList.add('js')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    const scan = () =>
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((n) => io.observe(n))
    scan()
    // Lazy routes render after this effect; catch them.
    const mo = new MutationObserver(scan)
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [pathname])
}

export function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Set document.title per page. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Nandhan Alahari` : 'Nandhan Alahari'
  }, [title])
}
