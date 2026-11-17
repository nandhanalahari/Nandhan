import { useEffect, useSyncExternalStore, type RefObject } from 'react'

/**
 * Contract between the pages and the Three.js universe.
 *
 * The universe is one persistent scene: a spiral galaxy, and inside one of its
 * arms a small planetary system where every world is a section of the site.
 * Pages never touch Three.js. They say WHERE THE CAMERA SHOULD BE:
 *
 *   - `useCosmosStop(ref, stop, side, dim)` on a section. As the page scrolls,
 *     the camera flies from stop to stop (home page: galaxy, dive in, then
 *     planet after planet).
 *   - `useCosmosPark(stop, side, dim)` on a page with no scroll journey: the
 *     camera simply sits at that world.
 *   - `cosmos.glance(stop)` to look at a world for a moment (hovering a row).
 *
 * The engine reads `cosmos.frame()` every animation frame and does its own
 * smoothing, so pages can change the target abruptly.
 */

/** Every place the camera can go. Project worlds use the project slug. */
export type StopId =
  | 'galaxy' // the whole spiral galaxy seen from outside
  | 'system' // wide establishing shot of the planetary system, all worlds in view
  | 'dc-router' // dark world with glowing data-hall grids and a thermal band
  | 'navrisk' // ocean world wrapped in flight arcs
  | 'kolana' // banded giant with a sweeping scan ring
  | 'memeqa' // ringed world; the ring is thousands of particles
  | 'nestor' // small moon
  | 'now' // young world with three moons: the three roles running now
  | 'principles' // a constellation of four stars
  | 'contact' // a pulsar: send a signal

/** Where the BODY sits on screen. Text goes on the opposite side. */
export type Side = 'left' | 'right' | 'center'

export interface CosmosFrame {
  from: StopId
  to: StopId
  /** 0..1 between `from` and `to`. Parked: from === to and t === 0. */
  t: number
  fromSide: Side
  toSide: Side
  /** 0..1: how far to pull the scene back so text stays readable. 0 = full presence. */
  dim: number
  /** True while scroll stops drive the camera; false when parked or glancing. */
  journey: boolean
}

/** The home page journey, in scroll order. Section element ids equal the stop ids. */
export const HOME_STOPS: readonly { id: StopId; label: string; side: Side }[] = [
  { id: 'galaxy', label: 'Home', side: 'right' },
  { id: 'dc-router', label: 'DC Router', side: 'left' },
  { id: 'navrisk', label: 'NavRisk', side: 'right' },
  { id: 'kolana', label: 'Kolana', side: 'left' },
  { id: 'memeqa', label: 'MemeQA', side: 'right' },
  { id: 'now', label: 'Now', side: 'left' },
  { id: 'principles', label: 'Principles', side: 'center' },
  { id: 'contact', label: 'Contact', side: 'center' },
]

interface Stop {
  el: HTMLElement
  stop: StopId
  side: Side
  dim: number
}

interface Park {
  stop: StopId
  side: Side
  dim: number
}

const DEFAULT_PARK: Park = { stop: 'galaxy', side: 'center', dim: 0.6 }

const stops = new Set<Stop>()
let parked: Park = DEFAULT_PARK
let glance: Park | null = null
let pinned: CosmosFrame | null = null

const still = (p: Park, journey: boolean): CosmosFrame => ({
  from: p.stop,
  to: p.stop,
  t: 0,
  fromSide: p.side,
  toSide: p.side,
  dim: p.dim,
  journey,
})

let frame: CosmosFrame = still(DEFAULT_PARK, false)
let active: StopId = frame.from

const frameListeners = new Set<() => void>()
const activeListeners = new Set<() => void>()

const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

function compute(): CosmosFrame {
  if (pinned) return pinned
  if (glance) return still(glance, false)
  if (stops.size === 0) return still(parked, false)

  const vh = window.innerHeight || 1
  const vc = vh / 2
  // A stop "holds" the camera while the viewport sits entirely inside its section;
  // between one section's hold end and the next one's hold start, the camera travels.
  const list = [...stops]
    .map((s) => {
      const r = s.el.getBoundingClientRect()
      const half = Math.min(r.height / 2, vh / 2)
      return { s, holdStart: r.top + half, holdEnd: r.bottom - half }
    })
    .sort((a, b) => a.holdStart - b.holdStart)

  const first = list[0]
  if (vc <= first.holdEnd) return still(first.s, true)
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i]
    const b = list[i + 1]
    if (vc <= b.holdStart) {
      const span = b.holdStart - a.holdEnd
      const f = span > 1 ? (vc - a.holdEnd) / span : 1
      // Linger briefly at each end even when sections are exactly one viewport tall.
      const t = smoothstep(0.1, 0.9, f)
      return {
        from: a.s.stop,
        to: b.s.stop,
        t,
        fromSide: a.s.side,
        toSide: b.s.side,
        dim: a.s.dim + (b.s.dim - a.s.dim) * t,
        journey: true,
      }
    }
    if (vc <= b.holdEnd) return still(b.s, true)
  }
  return still(list[list.length - 1].s, true)
}

function same(a: CosmosFrame, b: CosmosFrame) {
  return (
    a.from === b.from &&
    a.to === b.to &&
    a.fromSide === b.fromSide &&
    a.toSide === b.toSide &&
    a.journey === b.journey &&
    Math.abs(a.t - b.t) < 1e-4 &&
    Math.abs(a.dim - b.dim) < 1e-4
  )
}

function recompute() {
  const next = compute()
  if (same(next, frame)) return
  frame = next
  frameListeners.forEach((l) => l())
  const nextActive = frame.t < 0.5 ? frame.from : frame.to
  if (nextActive !== active) {
    active = nextActive
    activeListeners.forEach((l) => l())
  }
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    recompute()
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  // Lazy routes, fonts and images change section positions without a scroll event.
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.documentElement)
}

let arrived = false
const arriveListeners = new Set<() => void>()

export const cosmos = {
  /** Current camera target. Cheap; the engine calls this every frame. */
  frame: () => frame,
  /** Fires whenever `frame()` changes (the engine uses it to render on demand under reduced motion). */
  subscribe(l: () => void) {
    frameListeners.add(l)
    return () => {
      frameListeners.delete(l)
    }
  },
  /**
   * Look at one world for a moment, e.g. while a project row is hovered or focused.
   * Pass null to hand control back to the page's stops or park.
   */
  glance(stop: StopId | null, side: Side = 'right', dim = 0.1) {
    glance = stop ? { stop, side, dim } : null
    schedule()
  },
  /**
   * The hyperspace intro has finished and the page is revealed: the engine eases
   * the camera out of the jump into the first view. Called once by App.
   */
  arrive() {
    if (arrived) return
    arrived = true
    arriveListeners.forEach((l) => l())
  },
  /** QA only: freeze the camera at an exact frame (e.g. half way through the dive). */
  pin(f: CosmosFrame) {
    pinned = f
    schedule()
  },
  hasArrived: () => arrived,
  onArrive(l: () => void) {
    arriveListeners.add(l)
    return () => {
      arriveListeners.delete(l)
    }
  },
}

/**
 * Make `ref`'s section a stop on the scroll journey. While the viewport is inside
 * the section the camera holds at `stop` with the body on `side`; between two
 * stops it flies from one to the other as the page scrolls.
 */
export function useCosmosStop<T extends HTMLElement>(ref: RefObject<T>, stop: StopId, side: Side = 'center', dim = 0) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const entry: Stop = { el, stop, side, dim }
    stops.add(entry)
    schedule()
    return () => {
      stops.delete(entry)
      schedule()
    }
  }, [ref, stop, side, dim])
}

/** Park the camera at `stop` for as long as the calling page is mounted (pages without scroll stops). */
export function useCosmosPark(stop: StopId, side: Side = 'center', dim = 0.5) {
  useEffect(() => {
    const mine: Park = { stop, side, dim }
    parked = mine
    schedule()
    return () => {
      if (parked === mine) {
        parked = DEFAULT_PARK
        schedule()
      }
    }
  }, [stop, side, dim])
}

function subscribeActive(l: () => void) {
  activeListeners.add(l)
  return () => {
    activeListeners.delete(l)
  }
}

/** The stop the camera is at or nearest to. Re-renders only when it changes. */
export function useActiveStop(): StopId {
  return useSyncExternalStore(subscribeActive, () => active)
}
