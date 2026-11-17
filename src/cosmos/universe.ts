import {
  AddEquation,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DataTexture,
  DoubleSide,
  Group,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  Object3D,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RingGeometry,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  ZeroFactor,
  type IUniform,
  type WebGLRenderer,
} from 'three'
import * as G from './glsl'
import type { Side, StopId } from './journey'
import { CONSTELLATION, FOCUS, GALAXY, PULSAR, R_G, WORLDS, type WorldId } from './layout'
import * as GX from './galaxyShaders'
import { armZero, fieldStars, flightArcs, galaxyClouds, galaxyNoise, galaxyStars, RING, ringParticles, skyDome, type Cloud } from './particles'

/** Everything that exists in the scene, and how it moves when nobody is touching it. */

export interface Env {
  time: number
  dt: number
  camera: PerspectiveCamera
  /** Device pixels per world unit at distance 1. */
  px: number
  dpr: number
  halfW: number
  halfH: number
  /** World-space displacement of the camera over one shutter interval (drives star streaks). */
  vel: Vector3
  /** Same, in near-field units. */
  velN: Vector3
  /** Near-field odometer, each component in [0, 1). */
  odo: Vector3
  /** 0..1: dropping out of hyperspace. Stars streak radially, exposure blooms. */
  warp: number
}

export interface Universe {
  scene: Scene
  update(env: Env): void
  /** Offscreen passes that must run before the main render (the galaxy volume). */
  prepass(renderer: WebGLRenderer): void
  dispose(): void
}

type U = Record<string, IUniform>
const srgb = (hex: number) => new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255)
const lin = (hex: number) => {
  const c = srgb(hex)
  return c.set(Math.pow(c.x, 2.2), Math.pow(c.y, 2.2), Math.pow(c.z, 2.2))
}
const PREMUL = {
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneMinusSrcAlphaFactor,
  blendSrcAlpha: OneFactor,
  blendDstAlpha: OneMinusSrcAlphaFactor,
} as const
const ORIGIN = new Vector3()
const isGalactic = (s: StopId) => s === 'galaxy' || s === 'system'
const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

export function buildUniverse(lowPower: boolean, maxPoint: number): Universe {
  const scene = new Scene()
  const trash: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => {
    trash.push(x)
    return x
  }

  const uTime = { value: 0 }
  const uPx = { value: 1000 }
  const uDpr = { value: 1 }
  const uHalfRes = { value: new Vector2(1, 1) }

  /** Solid bodies: premultiplied "over", so a body can fade out cleanly (and its limb is anti-aliased by coverage). */
  const solid = (fragmentShader: string, uniforms: U, fade: { value: number }) =>
    keep(new ShaderMaterial({ vertexShader: G.bodyVert, fragmentShader, uniforms: { uTime, uFade: fade, ...uniforms }, transparent: true, ...PREMUL }))

  /** Additive over a premultiplied, transparent canvas: colour adds, alpha is left alone. */
  const light = (vertexShader: string, fragmentShader: string, uniforms: U, extra: Partial<ShaderMaterial> = {}) => {
    const m = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
    })
    Object.assign(m, extra)
    return keep(m)
  }

  const add = <T extends Object3D>(parent: Object3D, o: T, order = 0) => {
    o.frustumCulled = false
    o.renderOrder = order
    parent.add(o)
    return o
  }

  const points = (c: Cloud, metaSize = 4) => {
    const g = keep(new BufferGeometry())
    g.setAttribute('position', new BufferAttribute(c.pos, 3))
    g.setAttribute('aColor', new BufferAttribute(c.color, 3))
    g.setAttribute('aMeta', new BufferAttribute(c.meta, metaSize))
    return g
  }

  const sphere = keep(new SphereGeometry(1, lowPower ? 64 : 96, lowPower ? 40 : 64))
  const sphereLo = keep(new SphereGeometry(1, 40, 28))
  const quad = keep(new PlaneGeometry(2, 2))

  /* ---------------- galaxy: volume (offscreen), knots, stars; sky stars ---------------- */

  const noiseData = galaxyNoise(256)
  const noiseTex = keep(new DataTexture(noiseData, 256, 256, RGBAFormat))
  noiseTex.wrapS = noiseTex.wrapT = RepeatWrapping
  noiseTex.magFilter = LinearFilter
  noiseTex.minFilter = LinearMipmapLinearFilter
  noiseTex.generateMipmaps = true
  noiseTex.anisotropy = 4
  noiseTex.needsUpdate = true
  const arm0 = armZero(noiseData)

  // the volume: one big triangle, rendered into a half-float target at ~1 sample per CSS pixel
  const tri = keep(new BufferGeometry())
  tri.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
  const galInv = new Matrix4().compose(GALAXY.core, GALAXY.quat, new Vector3(R_G, R_G, R_G)).invert()
  const volU = {
    uNoise: { value: noiseTex },
    uInvVP: { value: new Matrix4() },
    uGalInv: { value: galInv },
    uCam: { value: new Vector3() },
    uPix: { value: 0.001 },
    uArm0: { value: arm0 },
    uHalo: { value: 1 },
    uNear: { value: 0.06 },
    uSteps: { value: 10 },
  }
  const volScene = new Scene()
  const volMat = keep(new ShaderMaterial({ vertexShader: GX.fullVert, fragmentShader: GX.galaxyVolFrag, uniforms: volU, depthTest: false, depthWrite: false }))
  add(volScene, new Mesh(tri, volMat))
  const volScale = lowPower ? 0.55 : 0.85
  const volRT = keep(new WebGLRenderTarget(1, 1, { type: HalfFloatType, format: RGBAFormat, depthBuffer: false, magFilter: LinearFilter, minFilter: LinearFilter }))
  const compU = { uTex: { value: volRT.texture }, uExposure: { value: 1 }, uSoft: { value: 0 }, uTexel: { value: new Vector2(1, 1) } }
  add(scene, new Mesh(tri, light(GX.fullVert, GX.galaxyCompFrag, compU, { depthTest: false })), -10)

  const streakU = () => ({
    uTime,
    uDpr,
    uHalfRes,
    uRef: { value: 12000 },
    uVel: { value: new Vector3() },
    uOdo: { value: new Vector3() },
    uMaxStreak: { value: 120 },
    uInside: { value: 0 },
    uGain: { value: 1 },
    uWarp: { value: 0 },
  })
  const domeU = streakU()
  add(scene, new Points(points(skyDome(lowPower ? 900 : 1600)), light(GX.starsVert(1), GX.starsFrag, domeU)), -8)
  const fieldU = streakU()
  add(scene, new Points(points(fieldStars(lowPower ? 900 : 1700)), light(GX.starsVert(2), GX.starsFrag, fieldU)), -7)

  const galaxy = add(scene, new Group())
  galaxy.position.copy(GALAXY.core)
  galaxy.quaternion.copy(GALAXY.quat)
  const uClock = { value: 0 }
  const uOmega = { value: 0.006 }
  const galStarsU = { ...streakU(), uRef: { value: 4500 }, uNoise: volU.uNoise, uR: { value: R_G }, uClock, uOmega, uArm0: volU.uArm0 }
  add(galaxy, new Points(points(galaxyStars(lowPower ? 14000 : 34000, noiseData)), light(GX.starsVert(0), GX.starsFrag, galStarsU)), -5)
  const cloudU = { uPx, uDpr, uMaxPt: { value: Math.min(maxPoint, 480) }, uGain: { value: 1 }, uNoise: volU.uNoise, uR: { value: R_G }, uClock, uOmega, uArm0: volU.uArm0 }
  add(galaxy, new Points(points(galaxyClouds(lowPower ? 360 : 800, noiseData)), light(GX.cloudVert, GX.cloudFrag, cloudU)), -6)
  const Y = new Vector3(0, 1, 0)

  /* ---------------- planetary system ---------------- */

  const system = add(scene, new Group())

  // orbit lines: only visible from a distance, where they turn a handful of dots into a system
  const circle = keep(new BufferGeometry())
  {
    const SEG = 256
    const pos = new Float32Array((SEG + 1) * 2 * 3)
    const side = new Float32Array((SEG + 1) * 2)
    const idx: number[] = []
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2
      for (let s = 0; s < 2; s++) {
        pos.set([Math.cos(a), 0, Math.sin(a)], (i * 2 + s) * 3)
        side[i * 2 + s] = s ? 1 : -1
      }
      if (i < SEG) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    }
    circle.setAttribute('position', new BufferAttribute(pos, 3))
    circle.setAttribute('aSide', new BufferAttribute(side, 1))
    circle.setIndex(idx)
  }
  const orbitGain = { value: 0 }
  const orbit = (parent: Object3D, radius: number, width: number, color: Vector3, gain: IUniform) =>
    add(parent, new Mesh(circle, light(G.orbitVert, G.lineFrag, { uRadius: { value: radius }, uWidth: { value: width }, uPx, uColor: { value: color }, uGain: gain }, { side: DoubleSide })), 2)
  const orbits = add(system, new Group())
  for (const id of Object.keys(WORLDS) as WorldId[]) orbit(orbits, WORLDS[id].orbit, 0.012, srgb(0x7c9fd8), orbitGain)

  /** An additive layer whose brightness follows its body's fade. */
  interface Gain {
    u: { value: number }
    base: number
  }
  interface Body {
    id: WorldId
    group: Group
    spinner: Object3D
    spin: number
    /** 0..1, eased: drops when the body would sit behind page text. */
    fade: { value: number }
    glowU: { uSize: IUniform<number>; uGain: IUniform<number> }
    glowSize: number
    glowGain: number
    gains: Gain[]
    /** Radius (world) of everything that belongs to the body: rings, moons. */
    extent: number
    tick?: (t: number) => void
  }
  const bodies: Body[] = []

  function body(id: WorldId, make: (fade: { value: number }) => ShaderMaterial, o: { tilt: [number, number]; spin: number; glow: number; glowGain: number; halo?: [number, number, number]; extent?: number }): Body {
    const w = WORLDS[id]
    const fade = { value: 1 }
    const group = add(system, new Group())
    group.position.copy(w.center)
    const tilt = add(group, new Group())
    tilt.rotation.set(o.tilt[0], 0, o.tilt[1])
    tilt.scale.setScalar(w.radius)
    const spinner = add(tilt, new Mesh(sphere, make(fade)))
    const gains: Gain[] = []
    if (o.halo) {
      const [color, thick, gain] = o.halo
      const k = 1 + thick
      const u = { value: gain }
      gains.push({ u, base: gain })
      const halo = add(tilt, new Mesh(sphereLo, light(G.haloVert, G.haloFrag, { uColor: { value: lin(color) }, uLimb: { value: Math.sqrt(1 - 1 / (k * k)) }, uGain: u }, { side: BackSide })), 1)
      halo.scale.setScalar(k)
    }
    const glowU = { uSize: { value: w.radius * 3 }, uGain: { value: o.glowGain }, uColor: { value: lin(o.glow) } }
    add(group, new Mesh(quad, light(G.spriteVert, G.glowFrag, glowU)), -1)
    const b: Body = { id, group, spinner, spin: o.spin, fade, glowU, glowSize: w.radius * 3, glowGain: o.glowGain, gains, extent: o.extent ?? w.radius }
    bodies.push(b)
    return b
  }

  // DC Router: the hot district sits on the night side, a little toward the camera so it reads in the hero frame
  {
    const w = WORLDS['dc-router']
    const L = w.center.clone().multiplyScalar(-1).normalize()
    const hotDir = w.camDir.clone().addScaledVector(L, -0.5).add(new Vector3(0, -0.2, 0)).normalize()
    body('dc-router', (f) => solid(G.dcRouterFrag, { uHot: { value: hotDir } }, f), { tilt: [0.2, -0.12], spin: 0.012, glow: 0x3f6fd0, glowGain: 0.06, halo: [0x5a8cff, 0.045, 0.55] })
  }

  // NavRisk
  {
    const b = body('navrisk', (f) => solid(G.navriskFrag, {}, f), { tilt: [0.32, 0.18], spin: 0.03, glow: 0x3c7ee8, glowGain: 0.1, halo: [0x5c9cff, 0.08, 0.7] })
    const a = flightArcs()
    const g = keep(new BufferGeometry())
    g.setAttribute('position', new BufferAttribute(a.pos, 3))
    g.setAttribute('aColor', new BufferAttribute(a.color, 3))
    g.setAttribute('aMeta', new BufferAttribute(a.meta, 3))
    const u = { value: 1 }
    b.gains.push({ u, base: 1 })
    add(b.spinner, new Points(g, light(G.arcVert, G.dotFrag, { uTime, uPx, uDpr, uGain: u })), 3)
  }

  // Kolana
  {
    const scanU = { uScan: { value: 0 }, uScanDir: { value: 1 } }
    const b = body('kolana', (f) => solid(G.kolanaFrag, scanU, f), { tilt: [0.28, -0.3], spin: 0.022, glow: 0x6a58e6, glowGain: 0.08, halo: [0x7a86ff, 0.05, 0.55] })
    const u = { value: 0.32 }
    b.gains.push({ u, base: 0.32 })
    const ring = add(b.spinner.parent!, new Mesh(keep(new TorusGeometry(1, 0.0028, 6, 200)), light(G.flatVert, G.flatFrag, { uColor: { value: srgb(0xbefff0) }, uGain: u })), 3)
    ring.rotation.x = Math.PI / 2
    b.tick = (t) => {
      const ph = (t * 0.085) % 2
      const tri = ph < 1 ? ph : 2 - ph
      const y = (tri * tri * (3 - 2 * tri) * 2 - 1) * 0.94
      scanU.uScan.value = y
      scanU.uScanDir.value = ph < 1 ? 1 : -1
      const r = Math.sqrt(1 - y * y) * 1.006
      ring.scale.set(r, r, 1)
      ring.position.y = y * 1.006
    }
  }

  // MemeQA: a continuous ring sheet for the optical depth, ~9,000 particles over it for the sparkle
  {
    const w = WORLDS.memeqa
    // tilt the ring so the camera sees its sunlit face (the unlit face reads as a grey disc)
    const Lm = w.center.clone().multiplyScalar(-1).normalize()
    const tiltRing = (x: number) => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x).premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.36))
    let ringQ = tiltRing(0.42)
    let ringN = new Vector3(0, 1, 0).applyQuaternion(ringQ)
    if (ringN.dot(Lm) * ringN.dot(w.camDir) < 0) {
      ringQ = tiltRing(-0.42)
      ringN = new Vector3(0, 1, 0).applyQuaternion(ringQ)
    }
    const b = body('memeqa', (f) => solid(G.memeqaFrag, { uCenter: { value: w.center }, uRingN: { value: ringN }, uRadius: { value: w.radius } }, f), { tilt: [0, 0], spin: 0.03, glow: 0xe8b8a0, glowGain: 0.06, halo: [0xffd6be, 0.04, 0.38], extent: w.radius * RING.outer })
    const tilt = b.spinner.parent!
    tilt.quaternion.copy(ringQ)
    const sheetGeo = keep(new RingGeometry(RING.inner - 0.02, RING.outer + 0.02, 360, 6))
    sheetGeo.rotateX(-Math.PI / 2)
    const sheet = new Mesh(
      sheetGeo,
      keep(
        new ShaderMaterial({
          vertexShader: G.ringSheetVert,
          fragmentShader: G.ringSheetFrag,
          uniforms: { uCenter: { value: w.center }, uRingN: { value: ringN }, uRadius: { value: w.radius }, uFade: b.fade },
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          ...PREMUL,
        }),
      ),
    )
    add(tilt, sheet, 2)
    const N_RING = 9000
    const rp = ringParticles(N_RING)
    const g = keep(new BufferGeometry())
    g.setAttribute('position', new BufferAttribute(new Float32Array(N_RING * 3), 3))
    g.setAttribute('aColor', new BufferAttribute(rp.color, 3))
    g.setAttribute('aOrbit', new BufferAttribute(rp.orbit, 4))
    const u = { value: 0.8 }
    b.gains.push({ u, base: 0.8 })
    add(tilt, new Points(g, light(G.ringVert, G.dotFrag, { uTime, uPx, uDpr, uCenter: { value: w.center }, uRadius: { value: w.radius }, uGain: u })), 3)
  }

  // moons share one shader
  const rock = (fade: { value: number }, a: number, bcol: number, crater: number, crack: number, seed: number, scale: number) =>
    solid(G.moonFrag, { uColA: { value: lin(a) }, uColB: { value: lin(bcol) }, uCrater: { value: crater }, uCrack: { value: crack }, uSeed: { value: seed }, uScale: { value: scale } }, fade)

  // Nestor (no home stop; parked from its project page)
  body('nestor', (f) => rock(f, 0x6e5a36, 0xd9b877, 1, 0, 3.7, 2.6), { tilt: [0.1, 0.2], spin: 0.02, glow: 0xc9a25c, glowGain: 0.05 })

  // Now: three moons, three roles. Their orbits open only ~24° toward the camera with the long axis
  // running up the screen, so they stay on the planet's side of the frame and pass in front of and behind it.
  {
    const w = WORLDS.now
    const b = body('now', (f) => solid(G.nowFrag, {}, f), { tilt: [0.25, 0.2], spin: 0.02, glow: 0xe8683a, glowGain: 0.08, halo: [0xff8a4c, 0.05, 0.42], extent: w.radius * 2.3 })
    const plane = add(b.group, new Group())
    const right = new Vector3().crossVectors(Y, w.camDir).normalize().applyAxisAngle(w.camDir, w.roll)
    const open = 24 * (Math.PI / 180)
    const n = right.clone().multiplyScalar(Math.cos(open)).addScaledVector(w.camDir, Math.sin(open)).normalize().applyAxisAngle(w.camDir, 0.3)
    plane.quaternion.setFromUnitVectors(Y, n)
    const moonGain = { value: 0.07 }
    b.gains.push({ u: moonGain, base: 0.07 })
    const defs: [number, number, number, number, ShaderMaterial][] = [
      [1.5, 0.15, 0.3, 0.4, rock(b.fade, 0x6f7076, 0xd4d5da, 1, 0, 1.3, 2.2)],
      [1.86, 0.105, 0.21, 2.6, rock(b.fade, 0x55799e, 0xc6daf0, 0.25, 1, 5.1, 2.0)],
      [2.25, 0.125, 0.15, 4.6, rock(b.fade, 0x6e4c58, 0xcfa4ac, 0.7, 0.3, 8.4, 2.4)],
    ]
    const moons = defs.map(([r, size, speed, phase, mat], i) => {
      const ring = add(plane, new Group())
      ring.rotation.set(i * 0.05 - 0.05, 0, i * -0.04 + 0.03)
      orbit(ring, r * w.radius, 0.003, srgb(0xffc9a0), moonGain)
      const m = add(ring, new Mesh(sphereLo, mat))
      m.scale.setScalar(size * w.radius)
      return { m, r: r * w.radius, speed, phase }
    })
    b.tick = (t) => {
      for (const o of moons) {
        const a = o.phase + t * o.speed
        o.m.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r)
        o.m.rotation.y = -a
      }
    }
  }

  /* ---------------- pulsar ---------------- */

  const pulsar = add(system, new Group())
  const pulsarFade = { value: 1 }
  const coreU = { uSize: { value: 4.4 }, uColor: { value: srgb(0xcfe0ff) }, uGain: { value: 1 }, uFlash: { value: 0 } }
  add(pulsar, new Mesh(quad, light(G.spriteVert, G.pulsarFrag, coreU)), 4)
  const beamGeo = keep(new PlaneGeometry(1, 2, 1, 1))
  beamGeo.translate(0.5, 0, 0)
  const beams = [1, -1].map((s) => {
    const u = { uAxis: { value: new Vector3() }, uLen: { value: 13 }, uWidth: { value: 1.1 }, uColor: { value: srgb(0xb8d0ff) }, uGain: { value: 0.5 } }
    add(pulsar, new Mesh(beamGeo, light(G.beamVert, G.beamFrag, u, { side: DoubleSide })), 4)
    return { s, u }
  })
  const rippleU = { uTime, uColor: { value: srgb(0xa9c4ff) }, uGain: { value: 0.6 } }
  const rippleGeo = keep(new PlaneGeometry(2, 2))
  rippleGeo.rotateX(-Math.PI / 2)
  const ripple = add(pulsar, new Mesh(rippleGeo, light(G.rippleVert, G.rippleFrag, rippleU, { side: DoubleSide })), 3)
  ripple.scale.setScalar(PULSAR.rippleR)
  ripple.quaternion.setFromUnitVectors(Y, PULSAR.axis)
  const e1 = new Vector3().crossVectors(PULSAR.axis, new Vector3(1, 0, 0)).normalize()
  const e2 = new Vector3().crossVectors(PULSAR.axis, e1)

  /* ---------------- constellation ---------------- */

  const constellation = add(scene, new Group())
  const conGain = { value: 1 }
  const conFade = { value: 1 }
  const conTints = [0xbcd8ff, 0xfff1dc, 0xffd0a0, 0xd6ccff]
  const conStars = CONSTELLATION.stars.map((p, i) => {
    const u = { uSize: { value: (46 - i * 3) * CONSTELLATION.scale * 1.35 }, uColor: { value: srgb(conTints[i]) }, uGain: { value: 1 }, uSpike: { value: 0.45 } }
    const m = add(constellation, new Mesh(quad, light(G.spriteVert, G.starFrag, u)), 4)
    m.position.copy(p)
    return u
  })
  {
    const pos: number[] = []
    const side: number[] = []
    const idx: number[] = []
    const d = new Vector3()
    const nrm = new Vector3()
    for (let i = 0; i < CONSTELLATION.stars.length - 1; i++) {
      const A = CONSTELLATION.stars[i]
      const B = CONSTELLATION.stars[i + 1]
      d.copy(B).sub(A)
      nrm.crossVectors(d, CONSTELLATION.dir).normalize().multiplyScalar(0.9 * CONSTELLATION.scale)
      const a = A.clone().addScaledVector(d, 0.11)
      const b = A.clone().addScaledVector(d, 0.89)
      const o = i * 4
      for (const [p, s] of [[a, 1], [a, -1], [b, 1], [b, -1]] as [Vector3, number][]) {
        pos.push(p.x + nrm.x * s, p.y + nrm.y * s, p.z + nrm.z * s)
        side.push(s)
      }
      idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2)
    }
    const g = keep(new BufferGeometry())
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('aSide', new BufferAttribute(new Float32Array(side), 1))
    g.setIndex(idx)
    add(constellation, new Mesh(g, light(G.ribbonVert, G.lineFrag, { uColor: { value: srgb(0x9db8e8) }, uGain: conGain }, { side: DoubleSide })), 3)
  }

  /* ---------------- per frame ---------------- */

  const cam = new Vector3()
  const rel = new Vector3()
  const fwd = new Vector3()
  const axis = new Vector3()

  let camRef: PerspectiveCamera | null = null
  let rtW = 0
  let rtH = 0
  // inside the disc every ray is a long shallow march and the image is soft anyway: render it smaller
  let lowRes = false
  const lastVP = new Float64Array(16)
  let lastSteps = -1
  let lastNear = -1
  let lastHalo = -1
  let sized = false
  function prepass(renderer: WebGLRenderer) {
    const c = camRef
    if (!c) return
    const k = volScale * (lowRes ? 0.6 : 1)
    volU.uSteps.value = (lowPower ? 7 : 10) - (lowRes ? 2 : 0)
    const w = Math.max(2, Math.round(((uHalfRes.value.x * 2) / uDpr.value) * k))
    const hh = Math.max(2, Math.round(((uHalfRes.value.y * 2) / uDpr.value) * k))
    if (w !== rtW || hh !== rtH) {
      rtW = w
      rtH = hh
      volRT.setSize(w, hh)
      sized = false
      compU.uTexel.value.set(1 / w, 1 / hh)
    }
    volU.uInvVP.value.multiplyMatrices(c.matrixWorld, c.projectionMatrixInverse)
    volU.uCam.value.copy(c.position)
    volU.uPix.value = (2 * Math.tan((c.fov * Math.PI) / 360)) / hh
    // the volume does not change over time (the arm pattern is fixed; only the particles orbit):
    // when nothing that feeds it moved, keep last frame's target
    const e = volU.uInvVP.value.elements
    let same = sized && volU.uSteps.value === lastSteps && volU.uNear.value === lastNear && volU.uHalo.value === lastHalo
    for (let i = 0; i < 16 && same; i++) same = Math.abs(e[i] - lastVP[i]) <= 1e-6 * (1 + Math.abs(e[i]))
    if (same) return
    for (let i = 0; i < 16; i++) lastVP[i] = e[i]
    lastSteps = volU.uSteps.value
    lastNear = volU.uNear.value
    lastHalo = volU.uHalo.value
    sized = true
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(volRT)
    renderer.clear(true, false, false)
    renderer.render(volScene, c)
    renderer.setRenderTarget(prev)
  }

  function update(env: Env) {
    const t = env.time
    uTime.value = t
    uPx.value = env.px
    uDpr.value = env.dpr
    uHalfRes.value.set(env.halfW, env.halfH)
    cam.copy(env.camera.position)
    env.camera.getWorldDirection(fwd)

    // how far inside the galactic disc the camera is
    rel.copy(cam).sub(GALAXY.core)
    const h = Math.abs(rel.dot(GALAXY.normal))
    const rho = Math.sqrt(Math.max(0, rel.lengthSq() - h * h))
    const inside = (1 - smooth(0.03 * R_G, 0.3 * R_G, h)) * (1 - smooth(R_G, 1.4 * R_G, rho))
    // galaxy: stars orbit through the fixed arm pattern; the clock all but stops once we are inside the disc
    uClock.value += env.dt * (0.08 + 0.92 * (1 - inside))
    domeU.uInside.value = inside
    // exposure: the disc seen edge-on from inside is far brighter per pixel than face-on; adapt like an eye would
    const hN = h / R_G
    if (hN < 0.009) lowRes = true
    else if (hN > 0.013) lowRes = false
    const flash = env.warp * env.warp
    // log-domain ramp: 1 at a quarter radius above the disc, ~0.08 inside it
    const x = smooth(0, 1, (Math.log(Math.max(hN, 1e-5)) - Math.log(0.004)) / (Math.log(0.25) - Math.log(0.004)))
    const exposure = Math.exp(Math.log(0.4) * (1 - x))
    compU.uExposure.value = exposure * (1 + 1.8 * flash)
    compU.uSoft.value = 1 - x
    volU.uHalo.value = 0.15 + 0.85 * x
    // once the camera is inside the young-star layer, its own neighbourhood is resolved stars, not glow
    volU.uNear.value = 0.06 + 0.16 * (1 - smooth(0.003, 0.014, hN))
    cloudU.uGain.value = Math.pow(exposure, 0.85) * (1 + flash)
    camRef = env.camera
    // resolved-star brightness falls off relative to how far we are from the galaxy as a whole
    galStarsU.uRef.value = Math.min(4500, Math.max(500, 0.38 * Math.hypot(rho, h)))
    galStarsU.uVel.value.copy(env.vel)
    fieldU.uVel.value.copy(env.velN)
    fieldU.uOdo.value.copy(env.odo)
    const streak = Math.min(maxPoint * 0.6, 150 * env.dpr)
    galStarsU.uMaxStreak.value = fieldU.uMaxStreak.value = streak
    domeU.uMaxStreak.value = Math.min(maxPoint * 0.6, 260 * env.dpr) * env.warp
    galStarsU.uWarp.value = env.warp * 0.5
    domeU.uWarp.value = env.warp * 0.35
    fieldU.uWarp.value = env.warp * 0.35
    galStarsU.uGain.value = 1 + 0.8 * flash

    const dSys = cam.length()
    system.visible = dSys < 9000
    // keep the text half clean: where the page text sits, every body except the one(s) being framed fades out
    const ease = 1 - Math.exp(-env.dt * 7)
    const settle = (u: { value: number }, target: number) => {
      u.value = env.dt > 0 ? u.value + (target - u.value) * ease : target
    }
    if (system.visible) {
      placeHeroes(env)
      // orbit lines only from a distance, where they turn a handful of dots into a system; up close they would cut through the text
      orbitGain.value = 0.16 * smooth(45, 90, dSys) * (1 - smooth(260, 900, dSys))
      orbits.visible = orbitGain.value > 0.002
      for (const b of bodies) {
        rel.copy(b.group.position).sub(cam)
        const dist = rel.length()
        const w = WORLDS[b.id]
        const pxR = (w.radius * env.px) / dist
        // skip anything behind the lens or too small to matter
        const ahead = rel.dot(fwd) > -b.extent * 4
        settle(b.fade, ahead ? clearOfText(env, b.id, b.group.position, b.extent, dist) : 1)
        b.group.visible = ahead && pxR > 0.05 && b.fade.value > 0.003
        if (!b.group.visible) continue
        b.spinner.rotation.y = t * b.spin
        b.tick?.(t)
        for (const g of b.gains) g.u.value = g.base * b.fade.value
        // far away a world is a point of light: keep the glow a few pixels wide and let it carry the colour
        const minSize = (2.2 * env.dpr * dist) / env.px
        b.glowU.uSize.value = Math.max(b.glowSize, minSize)
        b.glowU.uGain.value = b.glowGain * (1 + 5 * smooth(6, 1.2, pxR / env.dpr)) * b.fade.value
      }
      // lighthouse: the beam axis precesses around the spin axis
      settle(pulsarFade, clearOfText(env, 'contact', ORIGIN, 2.5, dSys))
      pulsar.visible = pulsarFade.value > 0.003
      const a = t * 1.15
      axis.copy(PULSAR.axis).multiplyScalar(0.8).addScaledVector(e1, Math.cos(a) * 0.6).addScaledVector(e2, Math.sin(a) * 0.6).normalize()
      rel.copy(cam).normalize()
      const flash = Math.pow(Math.abs(axis.dot(rel)), 10)
      // beams and signal rings belong to the contact shot (and the wide view); elsewhere they would slice across a planet's frame
      const lighthouse = Math.max(keepOf('contact'), smooth(30, 70, dSys)) * pulsarFade.value
      for (const b of beams) {
        b.u.uAxis.value.copy(axis).multiplyScalar(b.s)
        b.u.uGain.value = 0.5 * lighthouse
      }
      const minCore = (9 * env.dpr * dSys) / env.px
      coreU.uSize.value = Math.max(4.4, minCore)
      coreU.uFlash.value = flash
      coreU.uGain.value = (0.95 + 0.35 * flash) * pulsarFade.value
      rippleU.uGain.value = 0.6 * lighthouse
      ripple.visible = dSys < 200 && lighthouse > 0.003
    }

    constellation.visible = dSys < 4000
    if (constellation.visible) {
      settle(conFade, clearOfText(env, 'principles', CONSTELLATION.center, CONSTELLATION.radius, cam.distanceTo(CONSTELLATION.center)))
      const far = (1 - smooth(1500, 4000, dSys)) * conFade.value
      conGain.value = 0.2 * far
      for (let i = 0; i < conStars.length; i++) conStars[i].uGain.value = (0.9 + 0.1 * Math.sin(t * (0.7 + i * 0.23) + i * 2.1)) * far
    }
  }

  /**
   * 1 when an object may be seen where it is, falling to 0 as it moves into the part of the
   * screen the page text uses: the half opposite the framed body on desktop, the lower part on
   * phones, and everything around a centred body. The framed stop(s) never fade; the next one
   * is let through early in a flight so it can grow from a disc.
   */
  const ndc = new Vector3()
  /** Screen discs (NDC centre, NDC radii) of the framed worlds, so nothing else crowds them. */
  const heroes = [
    { id: '' as StopId, x: 0, y: 0, rx: 0, ry: 0, on: false },
    { id: '' as StopId, x: 0, y: 0, rx: 0, ry: 0, on: false },
  ]
  function placeHeroes(env: Env) {
    const ids = [FOCUS.a, FOCUS.b]
    for (let i = 0; i < 2; i++) {
      const h = heroes[i]
      h.id = ids[i]
      h.on = false
      const w = (WORLDS as Partial<Record<StopId, (typeof WORLDS)[WorldId]>>)[ids[i]]
      const c = w ? w.center : ids[i] === 'contact' ? ORIGIN : null
      const r = w ? w.frame * 1.15 : PULSAR.rippleR
      if (!c) continue
      ndc.copy(c).applyMatrix4(env.camera.matrixWorldInverse)
      const depth = -ndc.z
      if (depth <= r) continue
      ndc.applyMatrix4(env.camera.projectionMatrix)
      h.x = ndc.x
      h.y = ndc.y
      h.ry = (r * env.px) / depth / env.halfH
      h.rx = h.ry / env.camera.aspect
      h.on = true
    }
  }
  /** How much a stop is "being framed": 1 at its own stop, handing over during a flight. */
  function keepOf(id: StopId) {
    const { a, b, t } = FOCUS
    return Math.max(id === a ? 1 - smooth(0.55, 0.9, t) : 0, id === b ? smooth(0.08, 0.4, t) : 0)
  }
  function clearOfText(env: Env, id: StopId, center: Vector3, radius: number, dist: number): number {
    const { a, b, t, sideA, sideB, narrow } = FOCUS
    const keep = keepOf(id)
    if (keep >= 1) return 1
    if (isGalactic(a) && isGalactic(b)) return 1
    ndc.copy(center).applyMatrix4(env.camera.matrixWorldInverse)
    const depth = -ndc.z
    if (depth <= radius * 0.2) return 1
    ndc.applyMatrix4(env.camera.projectionMatrix)
    const pxCss = (radius * env.px) / Math.max(dist, 1e-3) / env.dpr
    const ry = (radius * env.px) / depth / env.halfH
    const rx = ry / env.camera.aspect
    const occ = (side: Side) => {
      if (narrow) return smooth(0.04, -0.1, ndc.y - ry) * smooth(1.2, 3, pxCss)
      if (side === 'center') return smooth(2, 6, pxCss)
      if (side === 'left') return smooth(-0.06, 0.08, ndc.x + rx) * smooth(1.2, 3, pxCss)
      return smooth(0.06, -0.08, ndc.x - rx) * smooth(1.2, 3, pxCss)
    }
    // the next section's text arrives early in a flight; weight its half accordingly
    const wb = smooth(0.15, 0.6, t)
    let o = isGalactic(a) ? occ(sideB) * wb : isGalactic(b) ? occ(sideA) * (1 - wb) : Math.max(occ(sideA) * (1 - wb), occ(sideB) * wb)
    // and never crowd the framed world itself: anything overlapping its disc steps back
    for (let i = 0; i < 2; i++) {
      const h = heroes[i]
      if (!h.on || h.id === id) continue
      const dx = (ndc.x - h.x) / (h.rx + rx)
      const dy = (ndc.y - h.y) / (h.ry + ry)
      o = Math.max(o, smooth(1.3, 1.0, Math.sqrt(dx * dx + dy * dy)) * (i === 0 ? 1 - smooth(0.6, 1, t) : smooth(0, 0.35, t)) * smooth(1.2, 3, pxCss))
    }
    return 1 - Math.min(1, o) * (1 - keep)
  }

  return {
    scene,
    update,
    prepass,
    dispose() {
      for (const x of trash) x.dispose()
      scene.clear()
    },
  }
}
