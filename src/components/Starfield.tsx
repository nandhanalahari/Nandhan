import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  depth: number
  phase: number
  speed: number
  tint: string
}

const TINTS = ['255,255,255', '255,255,255', '200,218,255', '142,180,255']

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let stars: Star[] = []
    let w = 0
    let h = 0
    let raf = 0
    let px = 0
    let py = 0
    let tx = 0
    let ty = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round((w * h) / 5200)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.08 ? 1 + Math.random() * 0.6 : 0.3 + Math.random() * 0.7,
        depth: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.4,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      }))
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      px += (tx - px) * 0.04
      py += (ty - py) * 0.04
      const scroll = window.scrollY
      for (const s of stars) {
        const twinkle = reduced ? 0.7 : 0.45 + 0.55 * Math.sin(t * 0.001 * s.speed + s.phase) ** 2
        let x = s.x + px * s.depth * 18
        let y = s.y + py * s.depth * 14 - scroll * s.depth * 0.08
        if (!reduced) y -= (t * 0.004 * s.depth) % h
        x = ((x % w) + w) % w
        y = ((y % h) + h) % h
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.tint},${(twinkle * (0.35 + s.depth * 0.6)).toFixed(3)})`
        ctx.fill()
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }

    const onMove = (e: PointerEvent) => {
      tx = e.clientX / w - 0.5
      ty = e.clientY / h - 0.5
    }

    const onScroll = () => {
      if (reduced) draw(0)
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    if (!reduced) window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div className="sky" aria-hidden="true">
      <canvas ref={ref} className="sky__stars" />
      <span className="sky__glow sky__glow--a" />
      <span className="sky__glow sky__glow--b" />
      <span className="sky__glow sky__glow--c" />
    </div>
  )
}
