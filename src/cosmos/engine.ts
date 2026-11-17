import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three'
import { cosmos, type CosmosFrame } from './journey'
import { FOV, blendPose, copyPose, makePose, pathPose, type Pose, type View } from './layout'
import { buildUniverse, type Env } from './universe'

/**
 * The render loop. Reads the camera target from `cosmos.frame()` every frame,
 * glides toward it (critically damped, in pose space), and hands the universe
 * an environment to animate against. Everything else lives in universe.ts.
 */

const NEAR_BOX = 2400 // near-field star cube edge, must match starsVert mode 2
const ARRIVE_S = 1.8
const HOP_S = 0.7
const GLANCE_S = 0.45

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export interface CosmosOptions {
  /** Treat arrival as already done (QA pins, reduced motion). */
  instant?: boolean
}

export function startCosmos(container: HTMLElement, opts: CosmosOptions = {}): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: !lowPower, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  } catch {
    return () => {}
  }
  const gl = renderer.getContext()
  const maxPoint = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = true
  const canvas = renderer.domElement
  canvas.className = 'cosmos__canvas'
  container.appendChild(canvas)

  const camera = new PerspectiveCamera(FOV, 1, 0.05, 1e6)
  const universe = buildUniverse(lowPower, maxPoint)

  /* ---------------- sizing ---------------- */
  const view: View = { aspect: 1, narrow: false }
  let W = 1
  let H = 1
  let dpr = 1
  const resize = () => {
    W = Math.max(1, container.clientWidth)
    H = Math.max(1, container.clientHeight)
    view.aspect = W / H
    view.narrow = W < 900
    dpr = Math.min(window.devicePixelRatio || 1, view.narrow ? 1.5 : 1.75)
    renderer.setPixelRatio(dpr)
    renderer.setSize(W, H, false)
    camera.aspect = view.aspect
    dirty = true
  }

  /* ---------------- camera state ---------------- */
  const target = makePose()
  const shown = makePose()
  const hopFrom = makePose()
  const tmp = makePose()
  let hasShown = false
  let hop = { t: 1, dur: HOP_S, warp: 0 }
  let lastKey = ''
  let arriveT = cosmos.hasArrived() || opts.instant || reduced ? 1 : -1 // -1 = still in hyperspace
  let dim = cosmos.frame().dim
  let dirty = true

  const frameTarget = (f: CosmosFrame, out: Pose) => pathPose(out, f.from, f.fromSide, f.to, f.toSide, f.t, view)

  const offArrive = cosmos.onArrive(() => {
    if (arriveT < 0) arriveT = 0
  })

  // Discontinuous target change (route change or glance): hop instead of flying the whole path.
  const onFrame = () => {
    dirty = true
    const f = cosmos.frame()
    const key = f.journey ? 'journey' : `${f.from}:${f.fromSide}`
    if (key !== lastKey) {
      if (lastKey && hasShown && !reduced) {
        copyPose(hopFrom, shown)
        const glancing = !f.journey && lastKey !== 'journey' && !lastKey.startsWith('galaxy')
        hop = { t: 0, dur: glancing ? GLANCE_S : HOP_S, warp: glancing ? 0 : 1 }
      }
      lastKey = key
    }
  }
  const offFrame = cosmos.subscribe(onFrame)
  onFrame()

  /* ---------------- pointer parallax ---------------- */
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / W) * 2 - 1
    pointer.y = (e.clientY / H) * 2 - 1
  }
  if (fine && !reduced) window.addEventListener('pointermove', onPointer, { passive: true })

  /* ---------------- env ---------------- */
  const env: Env = {
    time: 0,
    dt: 0,
    camera,
    px: 1,
    dpr: 1,
    halfW: 1,
    halfH: 1,
    vel: new Vector3(),
    velN: new Vector3(),
    odo: new Vector3(),
    warp: 0,
  }
  const prevPos = new Vector3()
  let havePrev = false

  const applyPose = (p: Pose, fovKick: number) => {
    camera.position.copy(p.pos)
    camera.quaternion.copy(p.quat)
    camera.fov = FOV * (1 + fovKick)
    camera.updateProjectionMatrix()
    // principal-point shift: where the optical axis lands on screen (keeps bodies undistorted)
    const m = camera.projectionMatrix.elements
    m[8] = -p.sx + pointer.sx * 0.015
    m[9] = -p.sy - pointer.sy * 0.015
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
    camera.updateMatrixWorld()
  }

  /* ---------------- loop ---------------- */
  let raf = 0
  let last = performance.now()
  let clock = 0
  let ready = false

  const tick = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    if (!reduced) clock += dt

    const f = cosmos.frame()
    frameTarget(f, target)

    // glide: exponential approach in pose space (blendPose handles huge zoom ranges geometrically)
    if (!hasShown || reduced) {
      copyPose(shown, target)
      hasShown = true
    } else {
      const k = 1 - Math.exp(-dt * (f.journey ? 7 : 9))
      blendPose(tmp, shown, target, k)
      copyPose(shown, tmp)
    }

    let pose: Pose = shown
    let fovKick = 0
    let warp = 0

    if (hop.t < 1) {
      hop.t = Math.min(1, hop.t + dt / hop.dur)
      blendPose(tmp, hopFrom, shown, easeIO(hop.t))
      pose = tmp
      fovKick = hop.warp * 0.35 * Math.sin(Math.PI * hop.t)
    }

    // arrival: drop out of hyperspace, a wide streaking FOV settling with a slight overshoot
    if (arriveT < 0) {
      fovKick += 0.9
      warp = 1
    } else if (arriveT < 1) {
      arriveT = Math.min(1, arriveT + dt / ARRIVE_S)
      const e = easeOut(arriveT)
      fovKick += 0.9 * (1 - e) - 0.04 * Math.sin(Math.PI * clamp01(arriveT * 1.4))
      // streaks collapse into points within the first ~0.6 s; the exposure bloom settles with the lens
      warp = Math.pow(1 - clamp01(arriveT * 1.6), 2.2)
    }

    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 3))
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 3))
    applyPose(pose, fovKick)

    // dim: CSS opacity on the canvas, eased
    dim += (f.dim - dim) * (reduced ? 1 : 1 - Math.exp(-dt * 4))
    canvas.style.opacity = ready ? String(1 - 0.8 * dim) : ''

    // environment for the universe
    if (havePrev && dt > 0) env.vel.copy(camera.position).sub(prevPos)
    else env.vel.set(0, 0, 0)
    if (arriveT < 0) env.vel.set(0, 0, -NEAR_BOX * 0.04).applyQuaternion(camera.quaternion)
    prevPos.copy(camera.position)
    havePrev = true
    env.velN.copy(env.vel).multiplyScalar(1 / NEAR_BOX)
    env.odo.set(
      ((camera.position.x / NEAR_BOX) % 1 + 1) % 1,
      ((camera.position.y / NEAR_BOX) % 1 + 1) % 1,
      ((camera.position.z / NEAR_BOX) % 1 + 1) % 1,
    )
    env.warp = warp
    env.time = clock
    env.dt = reduced ? 0 : dt
    env.dpr = dpr
    env.halfW = (W * dpr) / 2
    env.halfH = (H * dpr) / 2
    env.px = env.halfH / Math.tan((camera.fov * Math.PI) / 360)

    universe.update(env)
    universe.prepass(renderer)
    renderer.render(universe.scene, camera)
    dirty = false

    if (!ready) {
      ready = true
      canvas.classList.add('is-ready')
    }

    const settling = hop.t < 1 || (arriveT >= 0 && arriveT < 1)
    if (!document.hidden && (!reduced || dirty || settling)) raf = requestAnimationFrame(tick)
  }

  const kick = () => {
    if (!raf && !document.hidden) {
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  }
  const offKick = cosmos.subscribe(kick)
  const onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
      raf = 0
    } else kick()
  }
  document.addEventListener('visibilitychange', onVis)
  const ro = new ResizeObserver(() => {
    resize()
    kick()
  })
  ro.observe(container)

  const onLost = (e: Event) => {
    e.preventDefault()
    cancelAnimationFrame(raf)
    raf = 0
    canvas.style.display = 'none'
  }
  canvas.addEventListener('webglcontextlost', onLost)

  resize()
  kick()

  return () => {
    cancelAnimationFrame(raf)
    raf = 0
    offArrive()
    offFrame()
    offKick()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pointermove', onPointer)
    canvas.removeEventListener('webglcontextlost', onLost)
    universe.dispose()
    renderer.dispose()
    canvas.remove()
  }
}
