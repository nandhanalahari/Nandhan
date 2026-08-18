import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * A from-scratch ASCII 3D engine: shapes are precomputed point clouds
 * (position + surface normal). Each frame the cloud is rotated,
 * perspective-projected into a character grid with a z-buffer, and shaded
 * by normal·light mapped onto a ramp of characters. Cycles through a small
 * gallery of shapes; click to morph early.
 */

const W = 64
const H = 26
const K2 = 5 // camera distance
const K1 = (H * K2) / 6 // projection scale for objects of radius ~3
const SHADES = '.,-~:;=!*#$@'
// light from above-behind the camera
const LX = 0
const LY = Math.SQRT1_2
const LZ = -Math.SQRT1_2

/** packed as [x, y, z, nx, ny, nz] per point */
type Cloud = Float32Array

function buildTorus(): Cloud {
  const out: number[] = []
  const R1 = 1
  const R2 = 2
  for (let th = 0; th < Math.PI * 2; th += 0.09) {
    const ct = Math.cos(th)
    const st = Math.sin(th)
    for (let ph = 0; ph < Math.PI * 2; ph += 0.045) {
      const cp = Math.cos(ph)
      const sp = Math.sin(ph)
      out.push((R2 + R1 * ct) * cp, R1 * st, (R2 + R1 * ct) * sp)
      out.push(ct * cp, st, ct * sp)
    }
  }
  return new Float32Array(out)
}

function buildSphere(): Cloud {
  const out: number[] = []
  const R = 2.6
  for (let th = 0.02; th < Math.PI; th += 0.045) {
    const st = Math.sin(th)
    const ct = Math.cos(th)
    for (let ph = 0; ph < Math.PI * 2; ph += 0.045) {
      const nx = st * Math.cos(ph)
      const ny = ct
      const nz = st * Math.sin(ph)
      out.push(R * nx, R * ny, R * nz, nx, ny, nz)
    }
  }
  return new Float32Array(out)
}

function buildCube(): Cloud {
  const out: number[] = []
  const half = 1.9
  const n = 26
  for (let i = 0; i < n; i++) {
    const u = -half + (2 * half * i) / (n - 1)
    for (let j = 0; j < n; j++) {
      const v = -half + (2 * half * j) / (n - 1)
      out.push(u, v, -half, 0, 0, -1)
      out.push(u, v, half, 0, 0, 1)
      out.push(half, u, v, 1, 0, 0)
      out.push(-half, u, v, -1, 0, 0)
      out.push(u, half, v, 0, 1, 0)
      out.push(u, -half, v, 0, -1, 0)
    }
  }
  return new Float32Array(out)
}

function buildTrefoil(): Cloud {
  const out: number[] = []
  const SEGMENTS = 380
  const RING = 24
  const SCALE = 0.82
  const TUBE = 0.5

  const curve = (t: number): [number, number, number] => [
    (Math.sin(t) + 2 * Math.sin(2 * t)) * SCALE,
    (Math.cos(t) - 2 * Math.cos(2 * t)) * SCALE,
    -Math.sin(3 * t) * SCALE,
  ]

  // parallel-transport a frame along the curve to avoid tube twisting
  let nx = 0
  let ny = 0
  let nz = 1
  const dt = 0.001

  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2
    const [cx, cy, cz] = curve(t)
    const [ax, ay, az] = curve(t + dt)
    const [bx, by, bz] = curve(t - dt)
    let tx = ax - bx
    let ty = ay - by
    let tz = az - bz
    const tl = Math.hypot(tx, ty, tz) || 1
    tx /= tl
    ty /= tl
    tz /= tl

    // Gram-Schmidt the previous normal against the new tangent
    const d = nx * tx + ny * ty + nz * tz
    nx -= d * tx
    ny -= d * ty
    nz -= d * tz
    const nl = Math.hypot(nx, ny, nz) || 1
    nx /= nl
    ny /= nl
    nz /= nl

    // binormal = tangent × normal
    const bx2 = ty * nz - tz * ny
    const by2 = tz * nx - tx * nz
    const bz2 = tx * ny - ty * nx

    for (let j = 0; j < RING; j++) {
      const a = (j / RING) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const sx = ca * nx + sa * bx2
      const sy = ca * ny + sa * by2
      const sz = ca * nz + sa * bz2
      out.push(cx + TUBE * sx, cy + TUBE * sy, cz + TUBE * sz, sx, sy, sz)
    }
  }
  return new Float32Array(out)
}

const SHAPES = [
  { name: 'torus', build: buildTorus },
  { name: 'cube', build: buildCube },
  { name: 'trefoil knot', build: buildTrefoil },
  { name: 'sphere', build: buildSphere },
] as const

// depth range for banding: camera offset ± object radius (~3)
const DEPTH_MIN = K2 + 3.2 - 3
const DEPTH_MAX = K2 + 3.2 + 3
const BANDS = 4

/**
 * Renders the cloud into HTML: character = luminance (lighting),
 * color band = depth (near surfaces bright, far surfaces receding),
 * so the 3D structure is easy to read.
 */
function renderCloud(cloud: Cloud, ax: number, ay: number): string {
  const chars = new Array<string>(W * H).fill(' ')
  const bands = new Int8Array(W * H)
  const zbuf = new Float32Array(W * H)

  const sx = Math.sin(ax)
  const cx = Math.cos(ax)
  const sy = Math.sin(ay)
  const cy = Math.cos(ay)

  for (let i = 0; i < cloud.length; i += 6) {
    const x = cloud[i]
    const y = cloud[i + 1]
    const z = cloud[i + 2]

    // rotate position: X then Y
    const y1 = y * cx - z * sx
    const z1 = y * sx + z * cx
    const x2 = x * cy + z1 * sy
    const z2 = -x * sy + z1 * cy

    const depth = K2 + z2 + 3.2
    const ooz = 1 / depth
    const px = Math.floor(W / 2 + 2 * K1 * ooz * x2)
    const py = Math.floor(H / 2 - K1 * ooz * y1)
    if (px < 0 || px >= W || py < 0 || py >= H) continue

    const idx = py * W + px
    if (ooz <= zbuf[idx]) continue

    // rotate normal the same way, then shade against the light
    const nx = cloud[i + 3]
    const ny = cloud[i + 4]
    const nz = cloud[i + 5]
    const ny1 = ny * cx - nz * sx
    const nz1 = ny * sx + nz * cx
    const nx2 = nx * cy + nz1 * sy
    const nz2 = -nx * sy + nz1 * cy

    const lum = nx2 * LX + ny1 * LY + nz2 * LZ
    if (lum <= 0) continue

    zbuf[idx] = ooz
    chars[idx] = SHADES[Math.min(SHADES.length - 1, Math.floor(lum * SHADES.length))]
    const t = (depth - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)
    bands[idx] = Math.max(0, Math.min(BANDS - 1, Math.floor(t * BANDS)))
  }

  // group consecutive same-band characters into spans (SHADES contains no
  // HTML-significant characters, so no escaping is needed)
  let html = ''
  for (let r = 0; r < H; r++) {
    let runBand = -1
    let run = ''
    for (let c = 0; c < W; c++) {
      const idx = r * W + c
      const ch = chars[idx]
      if (ch === ' ') {
        run += ' '
        continue
      }
      const b = bands[idx]
      if (b !== runBand) {
        if (run) {
          html += runBand === -1 ? run : `<span class="d${runBand}">${run}</span>`
          run = ''
        }
        runBand = b
      }
      run += ch
    }
    if (run) {
      html += runBand === -1 ? run : `<span class="d${runBand}">${run}</span>`
    }
    html += '\n'
  }
  return html
}

export default function AsciiShapes() {
  const [shapeIdx, setShapeIdx] = useState(0)
  const preRef = useRef<HTMLPreElement>(null)
  const clouds = useRef<(Cloud | null)[]>(SHAPES.map(() => null))

  const cloud = useMemo(() => {
    if (!clouds.current[shapeIdx]) {
      clouds.current[shapeIdx] = SHAPES[shapeIdx].build()
    }
    return clouds.current[shapeIdx]!
  }, [shapeIdx])

  // auto-morph every 8s
  useEffect(() => {
    const id = setInterval(() => setShapeIdx((i) => (i + 1) % SHAPES.length), 8000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const pre = preRef.current
    if (!pre) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      pre.innerHTML = renderCloud(cloud, 0.9, 0.7)
      return
    }

    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 33) return // ~30fps
      last = t
      const s = t / 1000
      pre.innerHTML = renderCloud(cloud, s * 1.0, s * 0.55)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cloud])

  return (
    <div
      className="ascii-stage"
      onClick={() => setShapeIdx((i) => (i + 1) % SHAPES.length)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShapeIdx((i) => (i + 1) % SHAPES.length)
        }
      }}
      aria-label="Cycle ASCII shape"
    >
      <pre ref={preRef} className="ascii-art" aria-hidden="true" />
      <span className="ascii-label mono">
        {SHAPES[shapeIdx].name} · click to morph
      </span>
    </div>
  )
}
