import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { CubeEngine, inverseMoves, scrambleMoves, type Move } from '../cube/engine'

const SCRAMBLE_COUNT = 14

function formatTime(ms: number): string {
  const s = ms / 1000
  const whole = Math.floor(s)
  const hundredths = Math.floor((ms % 1000) / 10)
  return `${String(whole).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}s`
}

type Phase = 'idle' | 'scramble' | 'solve'

export default function RubiksCube() {
  const mountRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<CubeEngine | null>(null)
  const scrambleRef = useRef<Move[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [scrambled, setScrambled] = useState(false)
  const [move, setMove] = useState(0)
  const [total, setTotal] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const started = useRef(0)
  const phaseRef = useRef<Phase>('idle')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(5.4, 4.6, 6.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const key = new THREE.DirectionalLight(0xffffff, 1.7)
    key.position.set(5, 8, 6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x9eb6e0, 0.55)
    fill.position.set(-6, -2, -4)
    scene.add(fill)

    const view = new THREE.Group()
    const engine = new CubeEngine()
    engineRef.current = engine
    view.add(engine.group)
    scene.add(view)

    let yaw = 0.5
    let pitch = 0.35
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      mount.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      yaw += (e.clientX - lastX) * 0.008
      pitch += (e.clientY - lastY) * 0.008
      pitch = Math.max(-1.05, Math.min(1.05, pitch))
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = () => {
      dragging = false
    }
    mount.addEventListener('pointerdown', onDown)
    mount.addEventListener('pointermove', onMove)
    mount.addEventListener('pointerup', onUp)
    mount.addEventListener('pointercancel', onUp)

    const clock = new THREE.Clock()
    let raf = 0
    let lastUi = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.05)
      engine.update(dt)
      if (!dragging && !engine.busy) yaw += dt * 0.12
      view.rotation.y = yaw
      view.rotation.x = pitch
      const now = performance.now()
      if (phaseRef.current !== 'idle' && now - lastUi > 40) {
        lastUi = now
        setElapsed(now - started.current)
      }
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mount.removeEventListener('pointerdown', onDown)
      mount.removeEventListener('pointermove', onMove)
      mount.removeEventListener('pointerup', onUp)
      mount.removeEventListener('pointercancel', onUp)
      renderer.dispose()
      engineRef.current = null
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  const run = (moves: Move[], next: Phase, duration: number) => {
    const engine = engineRef.current
    if (!engine || engine.busy) return
    phaseRef.current = next
    setPhase(next)
    setMove(0)
    setTotal(moves.length)
    setElapsed(0)
    started.current = performance.now()
    engine.onMove = (remaining) => setMove(moves.length - remaining)
    engine.onIdle = () => {
      engine.onMove = null
      engine.onIdle = null
      phaseRef.current = 'idle'
      setPhase('idle')
      setMove(moves.length)
      setElapsed(performance.now() - started.current)
      setScrambled(next === 'scramble')
    }
    engine.enqueue(moves, duration)
  }

  const onScramble = () => {
    const moves = scrambleMoves(SCRAMBLE_COUNT)
    scrambleRef.current = moves
    run(moves, 'scramble', 0.13)
  }

  const onSolve = () => {
    if (!scrambled || scrambleRef.current.length === 0) return
    run(inverseMoves(scrambleRef.current), 'solve', 0.16)
  }

  const onReset = () => {
    const engine = engineRef.current
    if (!engine) return
    engine.reset()
    engine.onIdle = null
    scrambleRef.current = []
    phaseRef.current = 'idle'
    setPhase('idle')
    setScrambled(false)
    setMove(0)
    setTotal(0)
    setElapsed(0)
  }

  const label = phase === 'scramble' ? 'scrambling' : phase === 'solve' ? 'solving' : scrambled ? 'scrambled' : 'solved'

  return (
    <div className="cube">
      <div ref={mountRef} className="cube__stage" aria-label="Rubik's cube. Drag to rotate." />
      <div className="cube__meta mono">
        <span>drag to rotate</span>
        <span>{label} {formatTime(elapsed)}</span>
        <span>
          move {move} / {total || SCRAMBLE_COUNT}
        </span>
      </div>
      <div className="cube__actions">
        <button type="button" onClick={onScramble} disabled={phase !== 'idle'}>
          Scramble
        </button>
        <button type="button" onClick={onSolve} disabled={phase !== 'idle' || !scrambled}>
          Solve
        </button>
        <button type="button" onClick={onReset} disabled={phase === 'idle' && !scrambled && total === 0}>
          Reset
        </button>
      </div>
    </div>
  )
}
