import { useEffect, useRef, useState } from 'react'

const WARP_MS = 2600
const EXIT_MS = 700
const CRUISE = 0.12
const TOP_SPEED = 6.5
const TRAIL_S = 0.055

type Star = { x: number; y: number; z: number; tint: number }

const ease = (t: number) => t * t * t

function spawn(star: Star, far: boolean) {
  const angle = Math.random() * Math.PI * 2
  const r = 0.015 + Math.sqrt(Math.random()) * 1.1
  star.x = Math.cos(angle) * r
  star.y = Math.sin(angle) * r
  star.z = far ? 1 + Math.random() * 1.2 : 0.05 + Math.random() * 2.15
  star.tint = Math.random()
}

export default function Intro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [exiting, setExiting] = useState(false)
  const cbRef = useRef({ onReveal, onDone })
  cbRef.current = { onReveal, onDone }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    let focal = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      focal = Math.max(w, h) * 0.5
    }
    resize()
    window.addEventListener('resize', resize)

    const count = Math.round(Math.min(2200, Math.max(800, (w * h) / 450)))
    const stars: Star[] = Array.from({ length: count }, () => {
      const s = { x: 0, y: 0, z: 0, tint: 0 }
      spawn(s, false)
      return s
    })

    let raf = 0
    let start = 0
    let prev = 0
    let revealTimer: ReturnType<typeof setTimeout> | undefined
    let exitTimer: ReturnType<typeof setTimeout> | undefined

    const begin = () => {
      document.removeEventListener('visibilitychange', onVisible)
      start = prev = performance.now()
      revealTimer = setTimeout(() => {
        setExiting(true)
        cbRef.current.onReveal()
        exitTimer = setTimeout(() => cbRef.current.onDone(), EXIT_MS)
      }, WARP_MS)
      raf = requestAnimationFrame(frame)
    }
    const onVisible = () => {
      if (!document.hidden) begin()
    }

    const frame = (now: number) => {
      const dt = Math.max(0, Math.min((now - prev) / 1000, 1 / 20))
      prev = now
      const t = Math.max(0, Math.min(1, (now - start) / WARP_MS))

      const ramp = t < 0.18 ? 0 : ease((t - 0.18) / 0.82)
      const speed = CRUISE + (TOP_SPEED - CRUISE) * ramp
      const cx = w / 2
      const cy = h / 2

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75)
      bg.addColorStop(0, `rgba(${18 + 40 * ramp}, ${28 + 62 * ramp}, ${46 + 72 * ramp}, 1)`)
      bg.addColorStop(0.55, `rgba(${8 + 22 * ramp}, ${12 + 36 * ramp}, ${22 + 44 * ramp}, 1)`)
      bg.addColorStop(1, `rgba(4, 6, ${12 + 18 * ramp}, 1)`)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'
      const trail = speed * TRAIL_S + 0.004

      for (const s of stars) {
        s.z -= speed * dt
        if (s.z <= 0.015) {
          spawn(s, true)
          continue
        }
        const hx = cx + (s.x / s.z) * focal
        const hy = cy + (s.y / s.z) * focal
        if (hx < -80 || hx > w + 80 || hy < -80 || hy > h + 80) {
          spawn(s, true)
          continue
        }
        const tz = Math.min(2.4, s.z + trail)
        const tx = cx + (s.x / tz) * focal
        const ty = cy + (s.y / tz) * focal

        const depth = 1 - Math.min(1, s.z)
        const alpha = Math.min(1, 0.4 + depth * 1.1) * (0.6 + 0.4 * ramp)
        const g = 205 + s.tint * 50
        const b = 230 + s.tint * 25
        const r = 150 + s.tint * 105
        ctx.strokeStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`
        ctx.lineWidth = 0.5 + depth * depth * 2.6
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(hx, hy)
        ctx.stroke()
      }

      if (ramp > 0) {
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.35)
        core.addColorStop(0, `rgba(170, 215, 255, ${0.3 * ramp})`)
        core.addColorStop(1, 'rgba(170, 215, 255, 0)')
        ctx.fillStyle = core
        ctx.fillRect(0, 0, w, h)
      }

      if (t > 0.86) {
        const f = (t - 0.86) / 0.14
        const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * (0.15 + 0.9 * f))
        burst.addColorStop(0, `rgba(240, 247, 255, ${0.95 * f})`)
        burst.addColorStop(0.45, `rgba(190, 222, 255, ${0.55 * f * f})`)
        burst.addColorStop(1, 'rgba(190, 222, 255, 0)')
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = burst
        ctx.fillRect(0, 0, w, h)
      }

      raf = requestAnimationFrame(frame)
    }

    if (document.hidden) document.addEventListener('visibilitychange', onVisible)
    else begin()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      cancelAnimationFrame(raf)
      clearTimeout(revealTimer)
      clearTimeout(exitTimer)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className={`intro${exiting ? ' intro--exit' : ''}`} role="presentation" aria-hidden="true">
      <canvas ref={canvasRef} className="intro__canvas" />
    </div>
  )
}
