import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Side, StopId } from './journey'

/**
 * Where everything is, and where the camera stands to look at it.
 *
 * World space: the planetary system sits at the origin (its star is the pulsar),
 * ecliptic = XZ plane. The galaxy is real geometry around it: the system lives
 * half way out along one spiral arm, so the galactic core is ~1500 units away.
 * Pure math, no rendering; nothing here allocates per frame.
 */

export const FOV = 45
export const TAN_HALF = Math.tan((FOV * Math.PI) / 360)
const DEG = Math.PI / 180
const UP = new Vector3(0, 1, 0)

/* ------------------------------------------------------------------ worlds */

export type WorldId = 'dc-router' | 'navrisk' | 'kolana' | 'memeqa' | 'nestor' | 'now'

export interface WorldDef {
  id: WorldId
  center: Vector3
  orbit: number
  /** Body radius. */
  radius: number
  /** Radius the camera frames to the contracted on-screen diameter (larger when rings/moons need room). */
  frame: number
  /** Unit vector from the body to its camera. */
  camDir: Vector3
  /** Camera roll (rad) so the galactic band and ring axes sit on a diagonal. */
  roll: number
}

function world(
  id: WorldId,
  orbit: number,
  theta: number,
  radius: number,
  frameK: number,
  phase: number,
  sign: number,
  elev: number,
  roll = 0,
): WorldDef {
  const center = new Vector3(Math.cos(theta * DEG) * orbit, 0, Math.sin(theta * DEG) * orbit)
  // light comes from the origin; phase = angle between "toward the light" and "toward the camera"
  const L = center.clone().multiplyScalar(-1).normalize()
  const R = new Vector3(L.z, 0, -L.x)
  const h = L.multiplyScalar(Math.cos(phase * DEG)).addScaledVector(R, Math.sin(phase * DEG) * sign)
  const camDir = h
    .multiplyScalar(Math.cos(elev * DEG))
    .addScaledVector(UP, Math.sin(elev * DEG))
    .normalize()
  return { id, center, orbit, radius, frame: radius * frameK, camDir, roll: roll * DEG }
}

/** Outermost to innermost: the journey spirals in toward the pulsar. */
export const WORLDS: Record<WorldId, WorldDef> = {
  'dc-router': world('dc-router', 25, 0, 1.2, 1, 112, -1, 7, -8),
  navrisk: world('navrisk', 20.5, 118, 1.3, 1, 52, 1, 12, 10),
  kolana: world('kolana', 16, 232, 1.75, 1, 48, -1, 10, -12),
  memeqa: world('memeqa', 11.5, 338, 0.86, 1.62, 58, 1, 20, 16),
  now: world('now', 7, 75, 0.9, 1.5, 66, -1, 16, -10),
  nestor: world('nestor', 29, 160, 0.55, 1, 62, 1, 8, 6),
}

export const WORLD_IDS = Object.keys(WORLDS) as WorldId[]
export const SYSTEM_R = 29

/* ------------------------------------------------------------------ galaxy */

export const R_G = 3000
/**
 * Grand-design spiral: arm k sits at azimuth k * 2π/ARMS + ln(r / 0.1) * WIND
 * (a logarithmic spiral, pitch ≈ 23°), r normalized to R_G. Must match the
 * constants in galaxyShaders.ts (WIND, BAR).
 */
export const ARMS = 2
export const WIND = 2.3
/** Where the planetary system sits in the disc (normalized radius, azimuth): on arm 0. */
export const SYS_R = 0.5
export const SYS_AZ = Math.log(SYS_R / 0.1) * WIND

export const GALAXY = (() => {
  const inc = 24 * DEG
  const chi = 205 * DEG
  const n = new Vector3(Math.sin(inc) * Math.cos(chi), Math.cos(inc), Math.sin(inc) * Math.sin(chi))
  const bx = new Vector3(1, 0, 0).addScaledVector(n, -n.x).normalize()
  const bz = new Vector3().crossVectors(bx, n)
  // hero camera direction in galactic coordinates: 44° above the disc, system on the near-left side
  const gamma = SYS_AZ - 50 * DEG
  const el = 44 * DEG
  const eLocal = new Vector3(Math.cos(el) * Math.cos(gamma), Math.sin(el), Math.cos(el) * Math.sin(gamma))
  // spin the galactic frame about its normal so the hero camera sits "above and outside" dc-router's own camera
  const want = WORLDS['dc-router'].camDir.clone().setY(0.95).normalize()
  let best = -2
  const gx = new Vector3()
  const gz = new Vector3()
  const tx = new Vector3()
  const tz = new Vector3()
  const e = new Vector3()
  for (let i = 0; i < 720; i++) {
    const psi = (i / 720) * Math.PI * 2
    tx.copy(bx).multiplyScalar(Math.cos(psi)).addScaledVector(bz, Math.sin(psi))
    tz.crossVectors(tx, n)
    e.set(0, 0, 0).addScaledVector(tx, eLocal.x).addScaledVector(n, eLocal.y).addScaledVector(tz, eLocal.z)
    const d = e.dot(want)
    if (d > best) {
      best = d
      gx.copy(tx)
      gz.copy(tz)
    }
  }
  const basis = new Matrix4().makeBasis(gx, n, gz)
  const quat = new Quaternion().setFromRotationMatrix(basis)
  const sysLocal = new Vector3(Math.cos(SYS_AZ), 0, Math.sin(SYS_AZ)).multiplyScalar(SYS_R * R_G)
  const core = sysLocal.clone().applyQuaternion(quat).multiplyScalar(-1)
  const camDir = eLocal.clone().applyQuaternion(quat)
  // on-screen up: galactic north, rolled so the disc's long axis runs on a diagonal
  const fwd = camDir.clone().multiplyScalar(-1)
  const up = n.clone().addScaledVector(fwd, -n.dot(fwd)).normalize().applyAxisAngle(fwd, -16 * DEG)
  /** Unit direction from the system toward the core, in galactic-local coordinates. */
  const coreLocal = sysLocal.clone().multiplyScalar(-1).normalize()
  return { normal: n, quat, basis, core, camDir, up, coreLocal }
})()

/* ------------------------------------------------------------------ constellation, pulsar */

export const CONSTELLATION = (() => {
  const az = 300 * DEG
  const el = 50 * DEG
  const dir = new Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az))
  const right = new Vector3().crossVectors(dir, UP).normalize()
  const up = new Vector3().crossVectors(right, dir).normalize()
  const dist = 900
  // compact enough that the camera framing it stands well outside the planetary system (which stays behind the lens)
  const k = 0.58
  const flat: [number, number][] = [
    [-168, -52],
    [-54, 74],
    [48, -30],
    [164, 62],
  ]
  const stars = flat.map(([x, y]) => dir.clone().multiplyScalar(dist).addScaledVector(right, x * k).addScaledVector(up, y * k))
  const center = dir.clone().multiplyScalar(dist).addScaledVector(up, 10 * k)
  return { dir, right, up, stars, center, radius: 190 * k, scale: k }
})()

export const PULSAR = {
  /** Spin axis: slightly off the ecliptic normal. */
  axis: new Vector3(0.16, 0.975, -0.12).normalize(),
  rippleR: 5.2,
  camDir: new Vector3(Math.cos(24 * DEG) * Math.cos(250 * DEG), Math.sin(24 * DEG), Math.cos(24 * DEG) * Math.sin(250 * DEG)),
}

const SYSTEM_CAM = new Vector3(Math.cos(34 * DEG) * Math.cos(292 * DEG), Math.sin(34 * DEG), Math.cos(34 * DEG) * Math.sin(292 * DEG))

/* ------------------------------------------------------------------ poses */

export interface View {
  aspect: number
  /** Viewport narrower than 900px: every side behaves as center, higher up. */
  narrow: boolean
}

export interface Pose {
  pos: Vector3
  quat: Quaternion
  /** Principal-point shift in NDC: where the optical axis lands on screen. */
  sx: number
  sy: number
  /** Distance along the optical axis to what the pose looks at. */
  focus: number
}

export const makePose = (): Pose => ({ pos: new Vector3(), quat: new Quaternion(), sx: 0, sy: 0, focus: 1 })

export function copyPose(out: Pose, p: Pose) {
  out.pos.copy(p.pos)
  out.quat.copy(p.quat)
  out.sx = p.sx
  out.sy = p.sy
  out.focus = p.focus
}

const m4 = new Matrix4()
const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()
const v4 = new Vector3()
const q1 = new Quaternion()

/** Camera distance at which a sphere of radius r spans `frac` of the viewport height. */
function fit(r: number, frac: number) {
  const tan = frac * TAN_HALF
  return (r * Math.sqrt(1 + tan * tan)) / tan
}

const bodyFrac = (v: View) => (v.narrow ? Math.min(0.56 * v.aspect, 0.34) : Math.min(0.58, 0.4 * v.aspect))

function place(out: Pose, side: Side, v: View) {
  if (v.narrow) {
    out.sx = 0
    out.sy = 0.46 // 27% from the top
  } else if (side === 'center') {
    out.sx = 0
    out.sy = 0.2 // 40% from the top
  } else {
    out.sx = side === 'right' ? 0.42 : -0.42 // 71% / 29%
    out.sy = 0
  }
}

function aim(out: Pose, target: Vector3, dir: Vector3, dist: number, up: Vector3, roll: number) {
  out.pos.copy(target).addScaledVector(dir, dist)
  m4.lookAt(out.pos, target, up)
  out.quat.setFromRotationMatrix(m4)
  if (roll) out.quat.multiply(q1.setFromAxisAngle(v1.set(0, 0, 1), roll))
  out.focus = dist
}

const ORIGIN = new Vector3(0, 0, 0)
const SYSTEM_TARGET = new Vector3(0, -1.2, 0)

export function stopPose(out: Pose, stop: StopId, side: Side, v: View): Pose {
  place(out, side, v)
  switch (stop) {
    case 'galaxy': {
      // the disc's long axis spans ~38vw on desktop (core at 71%, arms end near 52%), ~90vw on phones
      const frac = v.narrow ? Math.min(0.9 * v.aspect, 0.52) : Math.min(0.385 * v.aspect, 0.96)
      aim(out, GALAXY.core, GALAXY.camDir, fit(R_G, frac), GALAXY.up, 0)
      break
    }
    case 'system': {
      const wide = v.narrow || side === 'center'
      const frac = Math.min((wide ? 0.94 : 0.54) * v.aspect, v.narrow ? 0.62 : 1.45)
      aim(out, SYSTEM_TARGET, SYSTEM_CAM, fit(SYSTEM_R + 2.5, frac), UP, 0)
      break
    }
    case 'principles': {
      const frac = v.narrow ? Math.min(0.86 * v.aspect, 0.36) : Math.min(0.5, 0.42 * v.aspect)
      aim(out, CONSTELLATION.center, v1.copy(CONSTELLATION.dir).multiplyScalar(-1), fit(CONSTELLATION.radius, frac), CONSTELLATION.up, 0)
      break
    }
    case 'contact': {
      const frac = v.narrow ? Math.min(0.8 * v.aspect, 0.4) : Math.min(0.6, 0.46 * v.aspect)
      aim(out, ORIGIN, PULSAR.camDir, fit(PULSAR.rippleR, frac), UP, -6 * DEG)
      break
    }
    default: {
      const w = WORLDS[stop]
      aim(out, w.center, w.camDir, fit(w.frame, bodyFrac(v)), UP, w.roll)
    }
  }
  return out
}

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

function slerpDir(out: Vector3, a: Vector3, b: Vector3, t: number) {
  const dot = Math.min(1, Math.max(-1, a.dot(b)))
  const om = Math.acos(dot)
  if (om < 1e-4) return out.copy(a).lerp(b, t).normalize()
  const so = Math.sin(om)
  const ka = Math.sin((1 - t) * om) / so
  const kb = Math.sin(t * om) / so
  return out.set(a.x * ka + b.x * kb, a.y * ka + b.y * kb, a.z * ka + b.z * kb)
}

/**
 * Fly from pose A to pose B. The distance to what B looks at shrinks (or grows)
 * geometrically, a constant-rate zoom, so the same code handles a 12,000-unit
 * dive into the galaxy and a 20-unit hop between planets; the camera position
 * swings around B's target while the view turns from A's heading to face it.
 */
export function blendPose(out: Pose, A: Pose, B: Pose, t: number): Pose {
  if (t <= 0) {
    copyPose(out, A)
    return out
  }
  if (t >= 1) {
    copyPose(out, B)
    return out
  }
  const target = v2.set(0, 0, -B.focus).applyQuaternion(B.quat).add(B.pos)
  const u0 = v3.copy(A.pos).sub(target)
  const d0 = Math.max(1e-3, u0.length())
  u0.multiplyScalar(1 / d0)
  const u1 = v4.copy(B.pos).sub(target)
  const d1 = Math.max(1e-3, u1.length())
  u1.multiplyScalar(1 / d1)
  const d = Math.exp(Math.log(d0) + (Math.log(d1) - Math.log(d0)) * t)
  slerpDir(out.pos, u0, u1, t).multiplyScalar(d).add(target)
  // face B's target, keeping B's roll, then blend from A's heading and lock on for the final approach
  const upB = v1.set(0, 1, 0).applyQuaternion(B.quat)
  m4.lookAt(out.pos, target, upB)
  q1.setFromRotationMatrix(m4)
  out.quat.copy(A.quat).slerp(q1, smooth(0, 0.82, t))
  out.sx = A.sx + (B.sx - A.sx) * t
  out.sy = A.sy + (B.sy - A.sy) * t
  out.focus = Math.exp(Math.log(A.focus) + (Math.log(d) - Math.log(A.focus)) * smooth(0, 0.82, t))
  return out
}

const pa = makePose()
const pb = makePose()

/**
 * What the camera is currently framing (written by pathPose, read by the universe):
 * the universe keeps every other body out of the half of the screen the page text uses.
 */
export const FOCUS = { a: 'galaxy' as StopId, b: 'galaxy' as StopId, t: 0, sideA: 'center' as Side, sideB: 'center' as Side, narrow: false }

/* ---------------- planet-to-planet flight ---------------- */

/** Spheres the camera must never cross, with a margin: every world, and the pulsar. */
const OBSTACLES = [...Object.values(WORLDS).map((w) => ({ c: w.center, r: w.frame * 1.6 })), { c: new Vector3(), r: 1.6 }]
const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
const f1 = new Vector3()
const f2 = new Vector3()
const f3 = new Vector3()
const f4 = new Vector3()
const fq = new Quaternion()
const fm = new Matrix4()

/**
 * An orbital move between two framed bodies: the camera eases back off A along its
 * line of sight, swings through a gentle arc (a little lift), and comes in to B down
 * B's own optical axis, so B grows from a disc into its half of the screen. The
 * heading turns from A's to "facing B" early, then locks on. The path is pushed out
 * of every body's safety sphere so it never passes through a world or the pulsar.
 */
function flyPose(out: Pose, A: Pose, B: Pose, t: number): Pose {
  const tA = f1.set(0, 0, -A.focus).applyQuaternion(A.quat).add(A.pos)
  const tB = f2.set(0, 0, -B.focus).applyQuaternion(B.quat).add(B.pos)
  const D = A.pos.distanceTo(B.pos)
  // Hermite tangents: leave backwards-and-toward-B, arrive along B's line of sight
  const chord = f3.copy(B.pos).sub(A.pos).normalize()
  const back = f4.copy(A.pos).sub(tA).normalize()
  const m0x = (chord.x * 0.55 + back.x * 0.75) * D
  const m0y = (chord.y * 0.55 + back.y * 0.75) * D
  const m0z = (chord.z * 0.55 + back.z * 0.75) * D
  const fwdB = f4.copy(tB).sub(B.pos).normalize()
  const m1x = (chord.x * 0.35 + fwdB.x * 0.9) * D
  const m1y = (chord.y * 0.35 + fwdB.y * 0.9) * D
  const m1z = (chord.z * 0.35 + fwdB.z * 0.9) * D
  const s = t
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  const lift = Math.sin(Math.PI * s) * D * 0.07
  out.pos.set(
    h00 * A.pos.x + h10 * m0x + h01 * B.pos.x + h11 * m1x,
    h00 * A.pos.y + h10 * m0y + h01 * B.pos.y + h11 * m1y + lift,
    h00 * A.pos.z + h10 * m0z + h01 * B.pos.z + h11 * m1z,
  )
  // never through a body: soft push out of each safety sphere (inactive at the endpoints, which are already outside)
  for (const o of OBSTACLES) {
    const d = f3.copy(out.pos).sub(o.c)
    const len = d.length()
    const safe = o.r * 1.25
    if (len < safe && len > 1e-6) {
      // f(len) = len + (safe - len)^2 / safe: continuous with slope 1 at the sphere, never below 0.75 * safe
      const f = len + ((safe - len) * (safe - len)) / safe
      out.pos.addScaledVector(d, f / len - 1)
    }
  }
  // heading: keep A in the lens while backing off it (it shrinks to a disc), pan across mid-flight,
  // then ride in on B; both aims are taken from where the camera actually is
  const e = ease(smooth(0.12, 0.72, t))
  const upA = f3.set(0, 1, 0).applyQuaternion(A.quat)
  fm.lookAt(out.pos, tA, upA)
  out.quat.setFromRotationMatrix(fm)
  const upB = f3.set(0, 1, 0).applyQuaternion(B.quat)
  fm.lookAt(out.pos, tB, upB)
  fq.setFromRotationMatrix(fm)
  out.quat.slerp(fq, e)
  out.sx = A.sx + (B.sx - A.sx) * e
  out.sy = A.sy + (B.sy - A.sy) * e
  out.focus = Math.max(1e-3, out.pos.distanceTo(tB))
  return out
}

const isGalactic = (s: StopId) => s === 'galaxy' || s === 'system'

export function pathPose(out: Pose, a: StopId, sideA: Side, b: StopId, sideB: Side, t: number, v: View): Pose {
  FOCUS.a = a
  FOCUS.b = b
  FOCUS.t = a === b ? 0 : Math.min(1, Math.max(0, t))
  FOCUS.sideA = sideA
  FOCUS.sideB = sideB
  FOCUS.narrow = v.narrow
  if (a === b || t <= 0) return stopPose(out, a, sideA, v)
  if (t >= 1) return stopPose(out, b, sideB, v)
  stopPose(pa, a, sideA, v)
  stopPose(pb, b, sideB, v)
  if (isGalactic(a) || isGalactic(b)) return blendPose(out, pa, pb, t)
  return flyPose(out, pa, pb, t)
}
