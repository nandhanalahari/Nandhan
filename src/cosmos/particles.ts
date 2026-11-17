import { Vector3 } from 'three'
import { GALAXY, R_G, SYS_AZ, SYS_R, WIND } from './layout'

/** Deterministic particle data for the galaxy, the sky, MemeQA's ring and NavRisk's flight arcs. */

type RGB = readonly [number, number, number]
const hex = (h: number): RGB => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const C = {
  star: hex(0xecf0fa),
  dust: hex(0x8d98b4),
  ion: hex(0x7cb8ff),
  flare: hex(0xffb067),
  rose: hex(0xf08fa8),
  cream: hex(0xf4e2c8),
}

/** mulberry32 */
function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rand: () => number) {
  const u = Math.max(1e-6, rand())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

export interface Cloud {
  pos: Float32Array
  color: Float32Array
  meta: Float32Array
}

function alloc(n: number, metaSize = 4): Cloud {
  return { pos: new Float32Array(n * 3), color: new Float32Array(n * 3), meta: new Float32Array(n * metaSize) }
}

function put(c: Cloud, i: number, x: number, y: number, z: number, col: RGB, m0: number, m1: number, m2: number, m3: number) {
  c.pos[i * 3] = x
  c.pos[i * 3 + 1] = y
  c.pos[i * 3 + 2] = z
  c.color[i * 3] = col[0]
  c.color[i * 3 + 1] = col[1]
  c.color[i * 3 + 2] = col[2]
  c.meta[i * 4] = m0
  c.meta[i * 4 + 1] = m1
  c.meta[i * 4 + 2] = m2
  c.meta[i * 4 + 3] = m3
}

/* ------------------------------------------------------------------ galaxy */

/** Linear-light star colours by spectral class, roughly O/B → M. */
const SPEC: RGB[] = [hex(0x9bb4ff), hex(0xaabfff), hex(0xcad7ff), hex(0xf8f7ff), hex(0xfff4ea), hex(0xffd2a1), hex(0xffb56c)]
const spec = (k: number): RGB => {
  const x = Math.min(SPEC.length - 1.001, Math.max(0, k))
  const i = Math.floor(x)
  return mix(SPEC[i], SPEC[i + 1], x - i)
}

/** Arm-0 centred azimuth at normalized radius r. */
const armAz = (r: number) => Math.log(Math.max(r, 1e-3) / 0.1) * WIND

/** Same wobble the shaders add to the arm phase (armPsi in galaxyShaders.ts), from the noise atlas. */
function wobble(noise: Uint8Array, x: number, z: number) {
  const S = 256
  const fx = (((x * 0.55 + 0.37) * S - 0.5) % S + S) % S
  const fz = (((z * 0.55 + 0.37) * S - 0.5) % S + S) % S
  const x0 = Math.floor(fx)
  const z0 = Math.floor(fz)
  const tx = fx - x0
  const tz = fz - z0
  const at = (xi: number, zi: number, ch: number) => noise[(((zi % S) * S + (xi % S)) * 4) + ch] / 255
  const bil = (ch: number) =>
    (at(x0, z0, ch) * (1 - tx) + at(x0 + 1, z0, ch) * tx) * (1 - tz) + (at(x0, z0 + 1, ch) * (1 - tx) + at(x0 + 1, z0 + 1, ch) * tx) * tz
  return (bil(0) - 0.5) * 0.55 + (bil(1) - 0.5) * 0.25 - armZero(noise)
}

let zeroOf: Uint8Array | null = null
let zero = 0
/** The wobble at the system itself: subtracted everywhere so arm 0 passes exactly through it. */
export function armZero(noise: Uint8Array) {
  if (zeroOf !== noise) {
    zeroOf = noise
    zero = 0
    zero = wobble(noise, Math.cos(SYS_AZ) * SYS_R, Math.sin(SYS_AZ) * SYS_R)
  }
  return zero
}

/** Azimuth of arm `arm` (0 or 1) at radius r, wobble included (two passes converge). */
function armAt(noise: Uint8Array, arm: number, r: number) {
  let az = arm * Math.PI + armAz(r)
  for (let k = 0; k < 2; k++) az = arm * Math.PI + armAz(r) - wobble(noise, Math.cos(az) * r, Math.sin(az) * r)
  return az
}

/** Photographic luminosity function: very many faint stars, a few bright ones. */
const lum = (r: () => number) => Math.pow(r(), 7)

/**
 * Resolved stars of the galaxy, in its own frame (disc in XZ, world units).
 * meta = size, alpha, random, population:
 *   0 old disc, 1 young arm stars (lit only while inside an arm), 2 bulge,
 *   3 the solar neighbourhood around the planetary system (only resolved up close).
 * The volume shader carries the unresolved light; these add the grain and sparkle.
 */
export function galaxyStars(n: number, noise: Uint8Array): Cloud {
  const r = prng(0x6a1a)
  const c = alloc(n)
  const nBulge = Math.floor(n * 0.12)
  const nOld = nBulge + Math.floor(n * 0.34)
  const nYoung = nOld + Math.floor(n * 0.24)
  const sysX = Math.cos(SYS_AZ) * SYS_R
  const sysZ = Math.sin(SYS_AZ) * SYS_R
  for (let i = 0; i < n; i++) {
    const L = lum(r)
    let x = 0
    let y = 0
    let z = 0
    let col: RGB
    let size = 0.7 + 2.3 * Math.sqrt(L)
    let alpha = 0.16 + 0.84 * L
    let pop = 0
    if (i < nBulge) {
      // triaxial, bar-aligned bulge
      const s = 0.035 + 0.05 * Math.pow(r(), 2)
      const bx = gauss(r) * s * 1.5
      const bz = gauss(r) * s * 0.75
      const ca = Math.cos(BAR_ANGLE)
      const sa = Math.sin(BAR_ANGLE)
      x = bx * ca - bz * sa
      z = bx * sa + bz * ca
      y = gauss(r) * s * 0.6
      col = spec(4.2 + r() * 2.3)
      pop = 2
    } else if (i < nOld) {
      // exponential disc, mildly enhanced in the arms
      let rad = 0
      let az = 0
      for (let k = 0; k < 6; k++) {
        rad = -Math.log(Math.max(1e-6, r() * r())) * 0.15
        az = r() * Math.PI * 2
        const psi = az - armAz(rad)
        if (r() < 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.cos(2 * psi), 3)) break
      }
      rad = Math.min(rad, 1.25)
      x = Math.cos(az) * rad
      z = Math.sin(az) * rad
      y = gauss(r) * 0.014
      col = spec(3.4 + r() * 3)
    } else if (i < nYoung) {
      // young, hot stars strung along the arms just downstream of the dust lanes
      const rad = 0.13 + Math.pow(r(), 0.85) * 0.95
      const arm = Math.floor(r() * 2)
      // scatter matches the volume's arm width (physical, not angular)
      const az = armAt(noise, arm, rad) + (gauss(r) * (0.03 + 0.022 * rad) - 0.012) / rad + (r() < 0.12 ? gauss(r) * 0.25 : 0)
      x = Math.cos(az) * rad
      z = Math.sin(az) * rad
      y = gauss(r) * 0.01
      col = spec(r() * 2.6)
      size *= 1.1
      alpha *= 1.15
      pop = 1
    } else {
      // solar neighbourhood: denser toward the system so the dive keeps resolving new stars
      const d = 0.16 * Math.pow(r(), 1.6) + 0.004
      const a = r() * Math.PI * 2
      x = sysX + Math.cos(a) * d
      z = sysZ + Math.sin(a) * d
      y = gauss(r) * (0.016 + d * 0.1)
      col = spec(r() < 0.3 ? r() * 2.5 : 2.5 + r() * 4)
      pop = 3
    }
    put(c, i, x * R_G, y * R_G, z * R_G, col, size, Math.min(1, alpha), r(), pop)
  }
  return c
}

/**
 * Star-forming knots: pink HII regions (with a blue cluster at their heart) and
 * blue young clusters, strung along the outer edge of each dust lane, a few
 * placed close to the system so the dive passes through them.
 * meta = world size, alpha, random, kind (0 HII, 1 cluster).
 */
export function galaxyClouds(n: number, noise: Uint8Array): Cloud {
  const r = prng(0xc10d)
  const c = alloc(n)
  const nNear = Math.floor(n * 0.04)
  for (let i = 0; i < n; i++) {
    const hii = r() < 0.58
    let rad: number
    let az: number
    if (i < nNear) {
      rad = SYS_R + gauss(r) * 0.03
      az = armAt(noise, 0, rad) - 0.05 + gauss(r) * 0.06
      // keep clear of the planetary system itself
      const dx = Math.cos(az) * rad - Math.cos(SYS_AZ) * SYS_R
      const dz = Math.sin(az) * rad - Math.sin(SYS_AZ) * SYS_R
      if (Math.hypot(dx, dz) < 0.02) az += 0.06 * (r() < 0.5 ? -1 : 1)
    } else {
      rad = 0.15 + Math.pow(r(), 0.8) * 0.85
      az = armAt(noise, Math.floor(r() * 2), rad) + (gauss(r) * (0.024 + 0.016 * rad) - 0.01) / rad + (r() < 0.1 ? gauss(r) * 0.25 : 0)
    }
    // knots come in strings: nudge along the arm in small clumps
    const L = Math.pow(r(), 3)
    const size = hii ? 0.0018 + 0.006 * L + 0.0012 * r() : 0.0012 + 0.0025 * L
    const col: RGB = hii ? mix(hex(0xff5c8a), hex(0xff7aa8), r()) : spec(r() * 1.6)
    put(c, i, Math.cos(az) * rad * R_G, gauss(r) * 0.003 * R_G, Math.sin(az) * rad * R_G, col, size * R_G, hii ? 0.45 + 0.5 * r() : 0.3 + 0.4 * r(), r(), hii ? 0 : 1)
  }
  return c
}

/** The bar's long axis in the galactic plane: the arms start at its ends. Must match BAR in glsl.ts. */
export const BAR_ANGLE = Math.log(0.14 / 0.1) * WIND

/**
 * Tileable noise atlas for the galaxy shaders, 4 independent channels:
 * R, G = fbm (base 4 and 8 cells), B = ridged fbm (filaments), A = fine fbm.
 * Built once (~15 ms), sampled with mipmaps so far-away detail never shimmers.
 */
export function galaxyNoise(size = 256): Uint8Array {
  const out = new Uint8Array(size * size * 4)
  const r = prng(0x5eed)
  const lattice = (cells: number) => {
    const t = new Float32Array(cells * cells)
    for (let i = 0; i < t.length; i++) t[i] = r()
    return t
  }
  const q = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
  const sample = (t: Float32Array, cells: number, u: number, v: number) => {
    const x = u * cells
    const y = v * cells
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = q(x - xi)
    const fy = q(y - yi)
    // cells is a power of two: wrap with a mask
    const m = cells - 1
    const x0 = xi & m
    const y0 = yi & m
    const x1 = (x0 + 1) & m
    const y1 = (y0 + 1) & m
    const a = t[y0 * cells + x0] + (t[y0 * cells + x1] - t[y0 * cells + x0]) * fx
    const b = t[y1 * cells + x0] + (t[y1 * cells + x1] - t[y1 * cells + x0]) * fx
    return a + (b - a) * fy
  }
  const specs: { base: number; oct: number; ridged: boolean }[] = [
    { base: 4, oct: 5, ridged: false },
    { base: 8, oct: 4, ridged: false },
    { base: 8, oct: 4, ridged: true },
    { base: 16, oct: 3, ridged: false },
  ]
  const tmp = new Float32Array(size * size)
  specs.forEach((s, ch) => {
    const tabs = Array.from({ length: s.oct }, (_, o) => lattice(s.base << o))
    let lo = Infinity
    let hi = -Infinity
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const u = (px + 0.5) / size
        const v = (py + 0.5) / size
        let sum = 0
        let amp = 0.5
        let norm = 0
        for (let o = 0; o < s.oct; o++) {
          let n = sample(tabs[o], s.base << o, u, v)
          if (s.ridged) n = 1 - Math.abs(2 * n - 1)
          sum += n * amp
          norm += amp
          amp *= s.ridged ? 0.55 : 0.5
        }
        const val = sum / norm
        tmp[py * size + px] = val
        if (val < lo) lo = val
        if (val > hi) hi = val
      }
    }
    for (let i = 0; i < size * size; i++) out[i * 4 + ch] = Math.round(((tmp[i] - lo) / (hi - lo)) * 255)
  })
  return out
}

/** Unit directions in world space. meta.w = 1 for stars that belong to the galactic band (hidden from outside). */
export function skyDome(n: number): Cloud {
  const r = prng(0xd03e)
  const c = alloc(n)
  const v = new Vector3()
  for (let i = 0; i < n; i++) {
    const band = i > n * 0.5
    if (band) {
      const lon = r() * Math.PI * 2
      const lat = gauss(r) * 0.17
      v.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon))
      // twice as many toward the core
      if (v.dot(GALAXY.coreLocal) < 0 && r() < 0.5) v.set(-v.x, v.y, -v.z)
      v.applyQuaternion(GALAXY.quat)
    } else {
      const th = r() * Math.PI * 2
      const y = 2 * r() - 1
      const s = Math.sqrt(1 - y * y)
      v.set(s * Math.cos(th), y, s * Math.sin(th))
    }
    const pick = r()
    const col = pick < 0.07 ? C.flare : pick < 0.3 ? C.ion : pick < 0.55 ? C.dust : C.star
    const bright = r() < 0.025
    put(c, i, v.x, v.y, v.z, col, bright ? 1.7 + r() * 0.7 : 0.75 + r() * 0.55, bright ? 0.85 : 0.2 + r() * 0.4, r(), band ? 1 : 0)
  }
  return c
}

/** Near field: uniform in the unit cube, wrapped around the camera in the shader. */
export function fieldStars(n: number): Cloud {
  const r = prng(0xf1e1d)
  const c = alloc(n)
  for (let i = 0; i < n; i++) {
    const pick = r()
    const col = pick < 0.06 ? C.flare : pick < 0.3 ? C.ion : pick < 0.5 ? C.dust : C.star
    put(c, i, r(), r(), r(), col, 0.8 + r() * 0.7, 0.25 + r() * 0.45, r(), 0)
  }
  return c
}

/** Must match ringDensity() in glsl.ts (planet radii). */
export const RING = { inner: 1.32, outer: 2.34 }
const sstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}
export function ringDensity(r: number) {
  const c = sstep(1.32, 1.38, r) * (1 - sstep(1.5, 1.53, r)) * 0.22
  const b = sstep(1.53, 1.57, r) * (1 - sstep(1.92, 1.94, r)) * (0.7 + 0.3 * sstep(1.6, 1.85, r))
  const a = sstep(2.02, 2.05, r) * (1 - sstep(2.3, 2.34, r)) * 0.62
  const gap = 1 - 0.9 * Math.exp(-(((r - 2.22) / 0.008) ** 2))
  return c + b + a * gap
}

/** color + orbit(radius, phase, height, size): sampled from the ring's density profile, icy and nearly colourless. */
export function ringParticles(n: number) {
  const r = prng(0x9000)
  const color = new Float32Array(n * 3)
  const orbit = new Float32Array(n * 4)
  const ice = hex(0xf2ece2)
  const dusty = hex(0xd8bfa4)
  const blue = hex(0xc4d6f2)
  for (let i = 0; i < n; i++) {
    let rad = 0
    do rad = RING.inner + (RING.outer - RING.inner) * r()
    while (r() * 1.0 > ringDensity(rad))
    const pick = r()
    let col = mix(dusty, ice, sstep(1.5, 2.3, rad) * 0.7 + r() * 0.3)
    if (pick < 0.12) col = mix(col, blue, 0.6)
    const big = r() < 0.04
    const k = 0.45 + r() * 0.55
    color[i * 3] = col[0] * k
    color[i * 3 + 1] = col[1] * k
    color[i * 3 + 2] = col[2] * k
    orbit[i * 4] = rad
    orbit[i * 4 + 1] = r() * Math.PI * 2
    orbit[i * 4 + 2] = gauss(r) * 0.006
    orbit[i * 4 + 3] = big ? 1.6 + r() * 0.6 : 0.6 + r() * 0.6
  }
  return { color, orbit }
}

const HUBS: [number, number][] = [
  [32.9, -97.04], [40.64, -73.78], [33.94, -118.4], [41.98, -87.9], [33.64, -84.43], [51.47, -0.45],
  [49.01, 2.55], [50.04, 8.56], [25.25, 55.36], [35.55, 139.78], [1.36, 103.99], [22.31, 113.91],
  [19.09, 72.87], [-33.94, 151.18], [-23.43, -46.47], [19.44, -99.07], [-26.13, 28.24], [47.45, -122.31],
  [61.17, -149.99], [21.32, -157.92], [-12.02, -77.11], [64.13, -21.94],
]
const ROUTES: [number, number][] = [
  [0, 1], [0, 2], [0, 5], [0, 15], [0, 9], [1, 5], [1, 6], [2, 9], [2, 13], [3, 7], [4, 14], [5, 8], [6, 16],
  [8, 12], [8, 10], [10, 13], [11, 9], [17, 11], [14, 16], [0, 19], [17, 18], [18, 9], [0, 20], [20, 14],
  [1, 21], [21, 5], [19, 13], [0, 14], [3, 17], [12, 10],
]

function latLon(lat: number, lon: number): [number, number, number] {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]
}

/** Great-circle routes lifted off a unit sphere. meta = path index + t, size, hub flag. */
export function flightArcs() {
  const per = 84
  const n = ROUTES.length * per + HUBS.length
  const pos = new Float32Array(n * 3)
  const color = new Float32Array(n * 3)
  const meta = new Float32Array(n * 3)
  let i = 0
  const push = (x: number, y: number, z: number, col: RGB, a: number, b: number, f: number) => {
    pos.set([x, y, z], i * 3)
    color.set(col, i * 3)
    meta.set([a, b, f], i * 3)
    i++
  }
  ROUTES.forEach(([ai, bi], ri) => {
    const A = latLon(HUBS[ai][0], HUBS[ai][1])
    const B = latLon(HUBS[bi][0], HUBS[bi][1])
    const om = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])))
    const so = Math.sin(om) || 1
    const lift = 0.035 + om * 0.075
    const flagged = ri % 7 === 2
    for (let k = 0; k < per; k++) {
      const t = (k + 0.5) / per
      const s0 = Math.sin((1 - t) * om) / so
      const s1 = Math.sin(t * om) / so
      const h = 1.006 + lift * Math.sin(Math.PI * t)
      push((A[0] * s0 + B[0] * s1) * h, (A[1] * s0 + B[1] * s1) * h, (A[2] * s0 + B[2] * s1) * h, flagged ? C.flare : mix(C.ion, C.star, 0.45), ri + Math.min(0.999, t), 1, 0)
    }
  })
  HUBS.forEach(([la, lo], hi) => {
    const [x, y, z] = latLon(la, lo)
    push(x * 1.008, y * 1.008, z * 1.008, C.cream, 1000 + hi, 2.1, 1)
  })
  return { pos, color, meta }
}
