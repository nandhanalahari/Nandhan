import { useEffect, useRef } from 'react'

/**
 * Generative flow-field art: particles drifting along a layered sine/cosine
 * vector field, leaving fading trails. A nod to decoding motion from neural
 * data. Colors are pulled from the CSS theme variables so it adapts to
 * light/dark mode, and the field gently swirls around the cursor. Rendered
 * fullscreen as the site's living background.
 */

const PARTICLE_COUNT = 750
const SPEED = 38 // px/s
const ACCENT_RATIO = 0.16

interface Particle {
  x: number
  y: number
  accent: boolean
}

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement)
  return {
    bg: styles.getPropertyValue('--bg').trim() || '#0a0a0a',
    stroke: styles.getPropertyValue('--muted-fg').trim() || '#9c9c9c',
    accent: styles.getPropertyValue('--accent-glow').trim() || '#00ff88',
  }
}

function fieldAngle(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.006 + t * 0.24) +
    Math.cos(y * 0.007 - t * 0.18) +
    Math.sin((x + y) * 0.003 + t * 0.1)
  ) * Math.PI
}

export default function FlowField({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let colors = readThemeColors()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const mouse = { x: -9999, y: -9999 }

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: 0,
      y: 0,
      accent: Math.random() < ACCENT_RATIO,
    }))

    const scatter = (p: Particle) => {
      p.x = Math.random() * w
      p.y = Math.random() * h
    }

    const clearAll = () => {
      ctx.globalAlpha = 1
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, w, h)
    }

    const resize = () => {
      w = wrap.clientWidth
      h = wrap.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles.forEach(scatter)
      clearAll()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // repaint with fresh colors when the theme toggles
    const mo = new MutationObserver(() => {
      colors = readThemeColors()
      clearAll()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // listen on the window so the field reacts even though it sits behind content
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onPointerLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerout', onPointerLeave)

    const step = (t: number, dt: number) => {
      // fade previous frame slightly -> trails
      ctx.globalAlpha = 0.04
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, w, h)

      ctx.lineWidth = 1.2
      for (const p of particles) {
        const angle = fieldAngle(p.x, p.y, t)
        let vx = Math.cos(angle) * SPEED
        let vy = Math.sin(angle) * SPEED

        // gentle vortex around the cursor
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < 130 * 130) {
          const d = Math.sqrt(d2) || 1
          const force = (1 - d / 130) * 90
          vx += (-dy / d) * force
          vy += (dx / d) * force
        }

        const nx = p.x + vx * dt
        const ny = p.y + vy * dt

        ctx.globalAlpha = p.accent ? 0.55 : 0.24
        ctx.strokeStyle = p.accent ? colors.accent : colors.stroke
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(nx, ny)
        ctx.stroke()

        p.x = nx
        p.y = ny
        if (p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4 || Math.random() < 0.002) {
          scatter(p)
        }
      }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0

    if (reduced) {
      // render a static composition instead of animating
      for (let i = 0; i < 160; i++) step(i * 0.06, 0.06)
    } else {
      let last = performance.now()
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick)
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now
        step(now / 1000, dt)
      }
      raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
