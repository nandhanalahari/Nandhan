import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks'

const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

/**
 * The stretch between the galaxy and the first world. Not a stop: it is
 * distance for the camera to fly in, holding one line that surfaces mid-flight
 * and falls behind. Static under reduced motion.
 */
export default function Dive() {
  const ref = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLParagraphElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    const line = lineRef.current
    if (!el || !line || reduced) return

    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      if (r.bottom < -vh || r.top > 2 * vh) return
      // 0 when the line is centred in the viewport; -1 / +1 a viewport before / after.
      const p = (vh / 2 - (r.top + r.height / 2)) / vh
      line.style.opacity = (1 - smoothstep(0.14, 0.52, Math.abs(p))).toFixed(3)
      line.style.transform = `scale(${(1 + p * 0.14).toFixed(4)})`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      line.style.opacity = ''
      line.style.transform = ''
    }
  }, [reduced])

  return (
    <div ref={ref} className="dive">
      <p ref={lineRef} className="dive__line">
        Every world in here is something I&nbsp;built.
      </p>
    </div>
  )
}
