import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import data from '../../content/dcrouter.json'
import './WeekReplay.css'

/* ------------------------------------------------------------------ data */

type PlanKey = 'asap' | 'optimized'
type Variant = 'full' | 'compact'

interface Item {
  id: string
  name: string
  zone: string
  start: number
  end: number
  gpus: number
  cost: number
}
interface Overheat {
  hour: number
  zone: string
  temp_c: number
  gpus_lost: number
  cost: number
}
interface Plan {
  total: number
  overheatCost: number
  overheats: Overheat[]
  items: Item[]
  temps: number[][]
}

const PLANS: Record<PlanKey, Plan> = { asap: data.asap, optimized: data.optimized }
const PLAN_LABEL: Record<PlanKey, string> = { asap: 'ASAP', optimized: 'DC Router' }
const LIMIT = data.tempLimit
const HOURS = 168
const ZONES = ['Z1', 'Z2', 'Z3', 'Z4']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TASK_IDS = data.backlog.map((b) => b.id)
const SHORT: Record<string, string> = {
  T1: 'CRAC-2',
  T2: 'PDU B',
  T3: 'Firmware',
  T4: 'UPS-A',
  T5: 'Fiber',
  T6: 'CDU-3',
}
/** Tasks that take a cooling unit offline: these are the ones that can overheat a zone. */
const COOLING = new Set(['T1', 'T6'])

/* The backend rounds each line to the cent, so items + overheat cost can drift from the
   reported total by a cent (ASAP: $31,867.41 vs $31,867.40). Scale the parts so the running
   counter lands exactly on the reported total. */
function costScale(p: Plan) {
  const parts = p.items.reduce((s, i) => s + i.cost, 0) + p.overheats.reduce((s, o) => s + o.cost, 0)
  return parts > 0 ? p.total / parts : 1
}
const SCALE: Record<PlanKey, number> = { asap: costScale(PLANS.asap), optimized: costScale(PLANS.optimized) }

function itemById(plan: PlanKey, id: string) {
  return PLANS[plan].items.find((i) => i.id === id)!
}

function costAt(plan: PlanKey, p: number) {
  const pl = PLANS[plan]
  let c = 0
  for (const it of pl.items) {
    const f = Math.min(1, Math.max(0, (p - it.start) / (it.end - it.start)))
    c += it.cost * f
  }
  for (const o of pl.overheats) if (o.hour <= p && p > 0) c += o.cost
  return c * SCALE[plan]
}

function overheatsAt(plan: PlanKey, p: number) {
  let n = 0
  for (const o of PLANS[plan].overheats) if (o.hour <= p && p > 0) n++
  return n
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function hourLabel(h: number) {
  const hh = Math.max(0, Math.min(HOURS - 1, Math.floor(h)))
  return `${DAYS[Math.floor(hh / 24)]} ${String(hh % 24).padStart(2, '0')}:00`
}
function endLabel(h: number) {
  return h >= HOURS ? 'Mon 00:00 (next week)' : hourLabel(h)
}

const SAVED = PLANS.asap.total - PLANS.optimized.total
const SAVED_PCT = (SAVED / PLANS.asap.total) * 100

/* ------------------------------------------------------------------ x scale
   Every task lands on Monday or Tuesday morning, so those days get more width.
   Piecewise linear, labeled in the axis so nothing is hidden. */

const DAY_WEIGHT = [6, 2.5, 1, 1, 1, 1, 1]
const DAY_SUM = DAY_WEIGHT.reduce((a, b) => a + b, 0)
const DAY_U: number[] = [0]
for (const w of DAY_WEIGHT) DAY_U.push(DAY_U[DAY_U.length - 1] + w / DAY_SUM)

/** hour (0..168) -> unit position (0..1) */
function hourToU(h: number) {
  const c = Math.max(0, Math.min(HOURS, h))
  const d = Math.min(6, Math.floor(c / 24))
  return DAY_U[d] + ((c - d * 24) / 24) * (DAY_U[d + 1] - DAY_U[d])
}
/** unit position (0..1) -> hour */
function uToHour(u: number) {
  const c = Math.max(0, Math.min(1, u))
  let d = 0
  while (d < 6 && c > DAY_U[d + 1]) d++
  return d * 24 + ((c - DAY_U[d]) / (DAY_U[d + 1] - DAY_U[d])) * 24
}

/* ------------------------------------------------------------------ layout */

interface Layout {
  priceH: number
  priceGap: number
  barH: number
  barGap: number
  cellH: number
  rowGap: number
  axisH: number
  minW: number
}
const LAYOUT: Record<Variant, Layout> = {
  full: { priceH: 64, priceGap: 18, barH: 20, barGap: 5, cellH: 24, rowGap: 12, axisH: 28, minW: 760 },
  compact: { priceH: 0, priceGap: 0, barH: 12, barGap: 4, cellH: 20, rowGap: 10, axisH: 26, minW: 660 },
}
function rowTop(l: Layout, i: number) {
  return l.priceH + l.priceGap + i * (l.barH + l.barGap + l.cellH + l.rowGap)
}
function plotH(l: Layout) {
  return rowTop(l, 4) - l.rowGap
}

/* ------------------------------------------------------------------ color */

type RGB = [number, number, number]
interface Palette {
  void: RGB
  hull: RGB
  star: RGB
  dust: RGB
  ion: RGB
  flare: RGB
  heat: RGB
}
function hex(v: string, fallback: RGB): RGB {
  const s = v.trim().replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(s)) return fallback
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el)
  const g = (n: string, f: RGB) => hex(cs.getPropertyValue(n), f)
  return {
    void: g('--void', [6, 10, 20]),
    hull: g('--hull', [12, 19, 34]),
    star: g('--star', [236, 240, 250]),
    dust: g('--dust', [141, 152, 180]),
    ion: g('--ion', [124, 184, 255]),
    flare: g('--flare', [255, 176, 103]),
    heat: g('--heat', [255, 94, 94]),
  }
}
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

function ramp(pal: Palette): { t: number; c: RGB }[] {
  return [
    { t: 22, c: mixRGB(pal.void, pal.ion, 0.24) },
    { t: 24.5, c: mixRGB(pal.void, pal.ion, 0.4) },
    { t: 27, c: mixRGB(pal.void, pal.ion, 0.72) },
    { t: 29, c: mixRGB(pal.ion, pal.star, 0.55) },
    { t: 30.8, c: pal.flare },
    { t: LIMIT - 0.01, c: mixRGB(pal.flare, pal.heat, 0.55) },
    { t: LIMIT, c: pal.heat },
    { t: 36, c: mixRGB(pal.heat, pal.star, 0.15) },
  ]
}
function colorFor(stops: { t: number; c: RGB }[], t: number): RGB {
  if (t <= stops[0].t) return stops[0].c
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].t) {
      const a = stops[i - 1]
      const b = stops[i]
      return mixRGB(a.c, b.c, (t - a.t) / (b.t - a.t))
    }
  }
  return stops[stops.length - 1].c
}

const PRICE_MIN = Math.min(...data.prices.map((p) => p.low))
const PRICE_MAX = Math.max(...data.prices.map((p) => p.high))

/* ------------------------------------------------------------------ hooks */

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

const ease = (t: number) => 1 - Math.pow(1 - t, 4)
const DURATION = 12000
const TWEEN = 900

/* ------------------------------------------------------------------ subcomponents */

function Summary({ plan, variant }: { plan: PlanKey; variant: Variant }) {
  const max = PLANS.asap.total
  return (
    <div className={`wr-summary wr-summary--${variant}`}>
      {(['asap', 'optimized'] as PlanKey[]).map((k) => {
        const p = PLANS[k]
        const maint = p.total - p.overheatCost
        return (
          <div key={k} className="wr-sum-row" data-selected={plan === k || undefined}>
            <span className="wr-sum-name">{PLAN_LABEL[k]}</span>
            <span className="wr-sum-track" aria-hidden="true">
              <span className="wr-sum-seg wr-sum-seg--maint" style={{ width: `${(maint / max) * 100}%` }} />
              {p.overheatCost > 0 && (
                <span className="wr-sum-seg wr-sum-seg--heat" style={{ width: `${(p.overheatCost / max) * 100}%` }} />
              )}
            </span>
            <span className="wr-sum-total data">{usd.format(p.total)}</span>
            <span className={`wr-sum-oh${p.overheats.length ? ' is-bad' : ''}`}>
              <span className="data">{p.overheats.length}</span> overheat{p.overheats.length === 1 ? '' : 's'}
            </span>
          </div>
        )
      })}
      <p className="wr-sum-saved">
        DC Router saves <strong className="data">{usd.format(SAVED)}</strong>{' '}
        <span className="data">({SAVED_PCT.toFixed(1)}%)</span> on the same six jobs
        {variant === 'full' && (
          <span className="muted">
            , <span className="data">{usd.format(PLANS.asap.overheatCost)}</span> of it from not losing GPUs to heat
          </span>
        )}
        .
      </p>
    </div>
  )
}

function ScheduleTable({ plan }: { plan: PlanKey }) {
  const p = PLANS[plan]
  const items = [...p.items].sort((a, b) => a.start - b.start || a.zone.localeCompare(b.zone))
  return (
    <details className="wr-details">
      <summary>View schedule as a table</summary>
      <div className="wr-table-wrap">
        <table className="wr-table">
          <caption>{PLAN_LABEL[plan]} plan, week of Mon 9 Nov 2026</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Zone</th>
              <th scope="col">Start</th>
              <th scope="col">End</th>
              <th scope="col" className="num">Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <th scope="row">{i.name}</th>
                <td>{i.zone}</td>
                <td className="data">{hourLabel(i.start)}</td>
                <td className="data">{endLabel(i.end)}</td>
                <td className="data num">{usd.format(i.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.overheats.length > 0 ? (
        <div className="wr-table-wrap">
          <table className="wr-table">
            <caption>Overheats (zone above {LIMIT}&nbsp;°C)</caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Zone</th>
                <th scope="col" className="num">Temp</th>
                <th scope="col" className="num">GPUs lost</th>
                <th scope="col" className="num">Cost</th>
              </tr>
            </thead>
            <tbody>
              {p.overheats.map((o) => (
                <tr key={`${o.hour}${o.zone}`}>
                  <td className="data">{hourLabel(o.hour)}</td>
                  <td>{o.zone}</td>
                  <td className="data num">{o.temp_c.toFixed(1)}&nbsp;°C</td>
                  <td className="data num">{o.gpus_lost}</td>
                  <td className="data num">{usd.format(o.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="wr-table-note">No zone crosses {LIMIT}&nbsp;°C in this plan.</p>
      )}
      <p className="wr-table-note">
        Total <span className="data">{usd.format(p.total)}</span>, including{' '}
        <span className="data">{usd.format(p.overheatCost)}</span> in overheat losses.
      </p>
    </details>
  )
}

/* ------------------------------------------------------------------ main */

export default function WeekReplay({ variant = 'full' }: { variant?: Variant }) {
  const L = LAYOUT[variant]
  const reduced = useReducedMotion()
  const uid = useId()

  const [plan, setPlan] = useState<PlanKey>('asap')
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState<PlanKey | null>(null)
  const [announce, setAnnounce] = useState('')
  const [plotW, setPlotW] = useState(0)
  const [overflowing, setOverflowing] = useState(false)
  const [tip, setTip] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<HTMLInputElement>(null)
  const hourRef = useRef<HTMLSpanElement>(null)
  const costRef = useRef<HTMLSpanElement>(null)
  const ohRef = useRef<HTMLSpanElement>(null)
  const ohWrapRef = useRef<HTMLDivElement>(null)
  const zoneRefs = useRef<(HTMLSpanElement | null)[]>([])
  const barRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const s = useRef({
    p: 0,
    mix: 0, // 0 = ASAP, 1 = DC Router
    mixFrom: 0,
    mixTo: 0,
    mixT0: 0,
    playing: false,
    last: 0,
    raf: 0,
    w: 0,
    pal: null as Palette | null,
    stops: [] as { t: number; c: RGB }[],
    plan: 'asap' as PlanKey,
    interacted: false,
    autoplayed: false,
    visible: false,
    reduced,
    dragging: false,
  })
  s.current.reduced = reduced

  /* ---------- drawing ---------- */

  const render = useCallback(() => {
    const st = s.current
    const W = st.w
    const canvas = canvasRef.current
    if (!canvas || !W || !st.pal) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const H = plotH(L)
    const pal = st.pal
    const m = ease(Math.min(1, Math.max(0, st.mix)))
    const px = (h: number) => hourToU(h) * W
    const snap = (x: number) => Math.round(x * dpr) / dpr
    const headX = px(st.p)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    /* price band (full only) */
    if (L.priceH > 0) {
      const top = 16
      const bot = L.priceH - 2
      const y = (v: number) => bot - ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * (bot - top)
      ctx.beginPath()
      data.prices.forEach((d, i) => {
        const x0 = px(i * 24)
        const x1 = px((i + 1) * 24)
        if (i === 0) ctx.moveTo(x0, y(d.high))
        else ctx.lineTo(x0, y(d.high))
        ctx.lineTo(x1, y(d.high))
      })
      for (let i = data.prices.length - 1; i >= 0; i--) {
        const d = data.prices[i]
        ctx.lineTo(px((i + 1) * 24), y(d.low))
        ctx.lineTo(px(i * 24), y(d.low))
      }
      ctx.closePath()
      ctx.fillStyle = css(pal.dust, 0.11)
      ctx.fill()
      ctx.beginPath()
      data.prices.forEach((d, i) => {
        const x0 = px(i * 24)
        const x1 = px((i + 1) * 24)
        if (i === 0) ctx.moveTo(x0, y(d.price))
        else ctx.lineTo(x0, y(d.price))
        ctx.lineTo(x1, y(d.price))
      })
      ctx.strokeStyle = css(pal.dust, 0.85)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    /* heat strip */
    const A = PLANS.asap.temps
    const B = PLANS.optimized.temps
    for (let z = 0; z < 4; z++) {
      const y0 = rowTop(L, z) + L.barH + L.barGap
      // bar track baseline
      ctx.fillStyle = css(pal.star, 0.07)
      ctx.fillRect(0, rowTop(L, z) + L.barH - 1, W, 1)
      for (let h = 0; h < HOURS; h++) {
        const x0 = snap(px(h))
        const x1 = snap(px(h + 1))
        const t = A[h][z] + (B[h][z] - A[h][z]) * m
        const future = px(h) >= headX
        ctx.globalAlpha = future ? 0.42 : 1
        ctx.fillStyle = css(colorFor(st.stops, t))
        ctx.fillRect(x0, y0, x1 - x0, L.cellH)
      }
      ctx.globalAlpha = 1
    }

    /* overheat flags: outline + hatch, fading with the crossfade */
    const flags: [PlanKey, number][] = [
      ['asap', 1 - m],
      ['optimized', m],
    ]
    for (const [k, alpha] of flags) {
      if (alpha <= 0.01) continue
      for (const o of PLANS[k].overheats) {
        const z = ZONES.indexOf(o.zone)
        const y0 = rowTop(L, z) + L.barH + L.barGap
        const x0 = snap(px(o.hour))
        const x1 = snap(px(o.hour + 1))
        const future = px(o.hour) >= headX
        ctx.globalAlpha = alpha * (future ? 0.45 : 1)
        ctx.save()
        ctx.beginPath()
        ctx.rect(x0, y0, x1 - x0, L.cellH)
        ctx.clip()
        ctx.strokeStyle = css(pal.void, 0.55)
        ctx.lineWidth = 1.25
        for (let d = -L.cellH; d < x1 - x0 + L.cellH; d += 5) {
          ctx.beginPath()
          ctx.moveTo(x0 + d, y0 + L.cellH)
          ctx.lineTo(x0 + d + L.cellH, y0)
          ctx.stroke()
        }
        ctx.restore()
        ctx.strokeStyle = css(pal.star, 0.95)
        ctx.lineWidth = 1.5
        ctx.strokeRect(x0 + 0.75, y0 + 0.75, x1 - x0 - 1.5, L.cellH - 1.5)
        // marker tick above the cell, in the gap
        ctx.fillStyle = css(pal.heat)
        const cx = (x0 + x1) / 2
        ctx.beginPath()
        ctx.moveTo(cx - 3.5, y0 - L.barGap + 0.5)
        ctx.lineTo(cx + 3.5, y0 - L.barGap + 0.5)
        ctx.lineTo(cx, y0 - 0.5)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    /* day dividers */
    ctx.fillStyle = css(pal.void, 1)
    for (let d = 1; d < 7; d++) {
      const x = snap(px(d * 24))
      ctx.fillRect(x - 1, 0, 2, H)
    }
    ctx.fillStyle = css(pal.star, 0.22)
    for (let d = 1; d < 7; d++) {
      const x = snap(px(d * 24))
      ctx.fillRect(x - 0.5, 0, 1, H)
    }

    /* ---------- DOM: bars, playhead, readouts ---------- */
    for (const id of TASK_IDS) {
      const el = barRefs.current[id]
      if (!el) continue
      const a = itemById('asap', id)
      const b = itemById('optimized', id)
      const st0 = a.start + (b.start - a.start) * m
      const en0 = a.end + (b.end - a.end) * m
      const x0 = px(st0)
      const x1 = px(en0)
      el.style.transform = `translate3d(${x0.toFixed(2)}px,0,0)`
      el.style.width = `${Math.max(4, x1 - x0 - 1).toFixed(2)}px`
      el.dataset.narrow = x1 - x0 < SHORT[id].length * 5.8 + 10 ? 'true' : 'false'
      const sel = PLANS[st.plan].items.find((i) => i.id === id)!
      el.dataset.active = st.p >= sel.start && st.p < sel.end ? 'true' : 'false'
    }
    if (playheadRef.current) playheadRef.current.style.transform = `translate3d(${headX.toFixed(2)}px,0,0)`

    const hh = Math.min(HOURS - 1, Math.floor(st.p))
    if (hourRef.current) hourRef.current.textContent = hourLabel(st.p)
    const cost = costAt('asap', st.p) * (1 - m) + costAt('optimized', st.p) * m
    if (costRef.current) costRef.current.textContent = usd.format(cost)
    const n = overheatsAt(st.plan, st.p)
    if (ohRef.current) ohRef.current.textContent = String(n)
    if (ohWrapRef.current) ohWrapRef.current.dataset.bad = n > 0 ? 'true' : 'false'
    for (let z = 0; z < 4; z++) {
      const el = zoneRefs.current[z]
      if (!el) continue
      const t = A[hh][z] + (B[hh][z] - A[hh][z]) * m
      el.textContent = `${t.toFixed(1)} °C`
      el.style.color = css(colorFor(st.stops, Math.max(t, 26.5)))
      el.dataset.hot = t >= LIMIT ? 'true' : 'false'
    }
    const r = rangeRef.current
    if (r && !st.dragging) {
      r.value = String(hh)
      r.setAttribute('aria-valuetext', hourLabel(st.p))
    }

    /* keep the playhead in view when the strip scrolls */
    const sc = scrollerRef.current
    if (sc && (st.playing || st.interacted) && sc.scrollWidth > sc.clientWidth + 1) {
      if (headX > sc.scrollLeft + sc.clientWidth - 48 || headX < sc.scrollLeft) {
        sc.scrollLeft = Math.max(0, headX - sc.clientWidth * 0.25)
      }
    }
  }, [L])

  /* ---------- animation loop ---------- */

  const describe = useCallback((k: PlanKey, p: number) => {
    const n = overheatsAt(k, p)
    return `${PLAN_LABEL[k]} plan at ${hourLabel(p)}: ${usd0.format(costAt(k, p))} so far, ${n} overheat${n === 1 ? '' : 's'}.`
  }, [])

  const frameRef = useRef<(now: number) => void>(() => {})
  frameRef.current = (now: number) => {
    const st = s.current
    st.raf = 0
    let again = false
    const dt = Math.min(64, now - st.last)
    st.last = now
    if (st.playing) {
      const u = hourToU(st.p) + dt / DURATION
      if (u >= 1) {
        st.p = HOURS
        st.playing = false
        setPlaying(false)
        setEnded(st.plan)
        setAnnounce(describe(st.plan, HOURS))
      } else {
        st.p = uToHour(u)
        again = true
      }
    }
    if (st.mix !== st.mixTo) {
      const k = (now - st.mixT0) / TWEEN
      if (k >= 1 || st.reduced) st.mix = st.mixTo
      else {
        // ease is applied in render; here progress is linear between from and to
        st.mix = st.mixFrom + (st.mixTo - st.mixFrom) * k
        again = true
      }
    }
    render()
    if (again) st.raf = requestAnimationFrame((t) => frameRef.current(t))
  }
  const kick = useCallback(() => {
    const st = s.current
    if (st.raf) return
    st.last = performance.now()
    st.raf = requestAnimationFrame((t) => frameRef.current(t))
  }, [])

  const play = useCallback(() => {
    const st = s.current
    if (st.p >= HOURS - 0.01) st.p = 0
    st.playing = true
    setPlaying(true)
    setEnded(null)
    kick()
  }, [kick])

  const pause = useCallback(
    (say = true) => {
      const st = s.current
      if (!st.playing) return
      st.playing = false
      setPlaying(false)
      if (say) setAnnounce(describe(st.plan, st.p))
    },
    [describe],
  )

  const choosePlan = useCallback(
    (k: PlanKey, replay = false) => {
      const st = s.current
      st.interacted = true
      if (st.plan === k && !replay) return
      st.plan = k
      setPlan(k)
      setEnded(null)
      const target = k === 'optimized' ? 1 : 0
      st.mixFrom = st.mix
      st.mixTo = target
      st.mixT0 = performance.now()
      if (st.reduced) st.mix = target
      setAnnounce(describe(k, st.p))
      if (replay) {
        st.p = 0
        play()
      }
      kick()
    },
    [describe, kick, play],
  )

  /* ---------- setup: palette, size, visibility ---------- */

  useLayoutEffect(() => {
    const st = s.current
    if (rootRef.current) {
      st.pal = readPalette(rootRef.current)
      st.stops = ramp(st.pal)
    }
    // reduced motion: show the whole week at once, no autoplay
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) st.p = HOURS
  }, [])

  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const ro = new ResizeObserver(() => {
      const w = Math.max(L.minW, Math.floor(sc.clientWidth))
      setPlotW(w)
      setOverflowing(w > sc.clientWidth + 1)
    })
    ro.observe(sc)
    return () => ro.disconnect()
  }, [L.minW])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !plotW) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const H = plotH(L)
    canvas.width = Math.round(plotW * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = `${plotW}px`
    canvas.style.height = `${H}px`
    s.current.w = plotW
    render()
  }, [plotW, L, render])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        const st = s.current
        st.visible = e.intersectionRatio >= 0.5
        if (st.visible && !st.autoplayed && !st.interacted && !st.reduced) {
          st.autoplayed = true
          play()
        } else if (!e.isIntersecting && st.playing) {
          pause(false)
        }
      },
      { threshold: [0, 0.5] },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [play, pause])

  useEffect(() => {
    const st = s.current
    return () => {
      if (st.raf) cancelAnimationFrame(st.raf)
      st.raf = 0
    }
  }, [])

  /* ---------- input ---------- */

  const seek = useCallback(
    (h: number) => {
      const st = s.current
      st.interacted = true
      st.p = Math.max(0, Math.min(HOURS, h))
      setEnded(null)
      kick()
    },
    [kick],
  )

  const onPlotPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const toHour = (cx: number) => uToHour((cx - rect.left) / rect.width)
    if (s.current.playing) pause(false)
    seek(toHour(e.clientX))
    if (e.pointerType !== 'mouse') return // let touch scroll the strip
    const move = (ev: PointerEvent) => seek(toHour(ev.clientX))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setAnnounce(describe(s.current.plan, s.current.p))
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
  }

  const tipItem = tip ? PLANS[plan].items.find((i) => i.id === tip) : undefined
  const tipStyle: CSSProperties | undefined = tipItem
    ? {
        left: `${(((hourToU(tipItem.start) + hourToU(tipItem.end)) / 2) * plotW).toFixed(1)}px`,
        top: `${rowTop(L, ZONES.indexOf(tipItem.zone))}px`,
      }
    : undefined

  const H = plotH(L)
  const radioName = `wr-plan-${uid}`
  const opt = PLANS.optimized
  const asap = PLANS.asap
  const summaryLabel =
    `Heat map of four data-hall zones over the week of 9 November 2026 with maintenance tasks above each zone. ` +
    `ASAP schedules CRAC-2 and CDU-3 together on Monday at 09:00; zones Z2 and Z3 exceed ${LIMIT} °C for ${asap.overheats.length} zone-hours, total ${usd.format(asap.total)}. ` +
    `DC Router staggers them; no zone exceeds ${LIMIT} °C, total ${usd.format(opt.total)}. Currently showing ${PLAN_LABEL[plan]}.`

  return (
    <div ref={rootRef} className={`wr wr--${variant}`} data-plan={plan}>
      {/* ---------- top bar ---------- */}
      <div className="wr-top">
        <div className="wr-seg" role="radiogroup" aria-label="Schedule to replay">
          {(['asap', 'optimized'] as PlanKey[]).map((k) => (
            <label key={k} className="wr-seg-opt" data-checked={plan === k || undefined}>
              <input
                type="radio"
                name={radioName}
                value={k}
                checked={plan === k}
                onChange={() => choosePlan(k)}
                className="sr-only"
              />
              <span>{PLAN_LABEL[k]}</span>
            </label>
          ))}
          <span className="wr-seg-thumb" aria-hidden="true" />
        </div>

        <div className="wr-readouts">
          <div className="wr-ro">
            <span className="wr-ro-label">Hour</span>
            <span ref={hourRef} className="wr-ro-val data">
              {hourLabel(0)}
            </span>
          </div>
          <div className="wr-ro">
            <span className="wr-ro-label">Cost so far</span>
            <span ref={costRef} className="wr-ro-val data">
              {usd.format(0)}
            </span>
          </div>
          <div className="wr-ro wr-ro--oh" ref={ohWrapRef}>
            <span className="wr-ro-label">Overheats</span>
            <span className="wr-ro-val data">
              <span ref={ohRef}>0</span>
              <span className="wr-ro-of"> zone-hours</span>
            </span>
          </div>
        </div>
      </div>

      {variant === 'full' && (
        <p className="wr-story">
          {plan === 'asap'
            ? 'ASAP starts everything Monday at 09:00. CRAC-2 and CDU-3 cool neighboring zones, and taking both offline at once pushes Z2 and Z3 past 32 °C.'
            : 'DC Router moves work into cheaper early hours and staggers the two cooling jobs, so every zone stays under 32 °C.'}
        </p>
      )}

      {/* ---------- plot ---------- */}
      <div className="wr-plot" style={{ '--wr-h': `${H + L.axisH}px` } as CSSProperties}>
        <div className="wr-col wr-col--labels" aria-hidden="true">
          {L.priceH > 0 && (
            <span className="wr-lab wr-lab--price" style={{ top: 10 }}>
              H100
            </span>
          )}
          {ZONES.map((z, i) => (
            <span
              key={z}
              className="wr-lab"
              style={{ top: rowTop(L, i), height: L.barH + L.barGap + L.cellH }}
            >
              {z}
            </span>
          ))}
        </div>

        <div className="wr-scroll-shell" data-overflow={overflowing || undefined}>
          <div ref={scrollerRef} className="wr-scroller">
            <div
              className="wr-canvas-wrap"
              style={{ width: plotW || '100%', height: H + L.axisH }}
              role="img"
              aria-label={summaryLabel}
              onPointerDown={onPlotPointer}
            >
              <canvas ref={canvasRef} aria-hidden="true" />

              {L.priceH > 0 &&
                data.prices.map((d, i) => (
                  <span
                    key={d.date}
                    className="wr-price data"
                    aria-hidden="true"
                    style={{ left: `${(hourToU(i * 24) * 100).toFixed(3)}%` }}
                  >
                    ${d.price.toFixed(2)}
                    {i === 0 && <span className="wr-price-unit"> /GPU-hr</span>}
                  </span>
                ))}

              <div className="wr-bars">
                {TASK_IDS.map((id) => {
                  const it = PLANS[plan].items.find((i) => i.id === id)!
                  const z = ZONES.indexOf(it.zone)
                  return (
                    <button
                      key={id}
                      type="button"
                      ref={(el) => {
                        barRefs.current[id] = el
                      }}
                      className={`wr-bar${COOLING.has(id) ? ' wr-bar--cool' : ''}`}
                      style={{ top: rowTop(L, z), height: L.barH, '--wr-hit': `${L.barH + L.barGap + L.cellH}px` } as CSSProperties}
                      aria-label={`${it.name}, zone ${it.zone}, ${hourLabel(it.start)} to ${endLabel(it.end)}, ${usd.format(it.cost)}${COOLING.has(id) ? ', takes cooling offline' : ''}`}
                      onMouseEnter={() => setTip(id)}
                      onMouseLeave={() => setTip((t) => (t === id ? null : t))}
                      onFocus={() => setTip(id)}
                      onBlur={() => setTip((t) => (t === id ? null : t))}
                    >
                      {variant === 'full' && <span className="wr-bar-label">{SHORT[id]}</span>}
                    </button>
                  )
                })}
              </div>

              {tipItem && (
                <div className="wr-tip" style={tipStyle} aria-hidden="true">
                  <strong>{tipItem.name}</strong>
                  <span className="data">
                    {hourLabel(tipItem.start)} to {endLabel(tipItem.end)}
                  </span>
                  <span>
                    Zone {tipItem.zone}, <span className="data">{usd.format(tipItem.cost)}</span>
                  </span>
                  {COOLING.has(tipItem.id) && <span className="wr-tip-cool">Cooling unit offline</span>}
                </div>
              )}

              <div ref={playheadRef} className="wr-playhead" style={{ height: H + 6 }} aria-hidden="true" />

              <div className="wr-axis" style={{ top: H + 6 }} aria-hidden="true">
                {DAYS.map((d, i) => (
                  <span
                    key={d}
                    className="wr-day"
                    style={{
                      left: `${(hourToU(i * 24) * 100).toFixed(3)}%`,
                      width: `${((hourToU((i + 1) * 24) - hourToU(i * 24)) * 100).toFixed(3)}%`,
                    }}
                  >
                    {d}
                    {i === 0 && <span className="wr-day-note"> 9 Nov</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {overflowing && (
            <span className="wr-scroll-hint" aria-hidden="true">
              Swipe for the rest of the week
            </span>
          )}
        </div>

        <div className="wr-col wr-col--values" aria-hidden="true">
          {ZONES.map((z, i) => (
            <span
              key={z}
              ref={(el) => {
                zoneRefs.current[i] = el
              }}
              className="wr-zval data"
              style={{ top: rowTop(L, i) + L.barH + L.barGap, height: L.cellH }}
            >
              --
            </span>
          ))}
        </div>
      </div>

      {/* ---------- transport ---------- */}
      <div className="wr-transport">
        <button
          type="button"
          className="wr-play"
          onClick={() => {
            s.current.interacted = true
            if (playing) pause()
            else play()
          }}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
              <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7z" fill="currentColor" />
            </svg>
          )}
        </button>
        <label className="wr-range-wrap">
          <span className="sr-only">Hour of the week</span>
          <input
            ref={rangeRef}
            className="wr-range"
            type="range"
            min={0}
            max={HOURS - 1}
            step={1}
            defaultValue={0}
            aria-valuetext={hourLabel(0)}
            onPointerDown={() => {
              s.current.dragging = true
              if (s.current.playing) pause(false)
            }}
            onPointerUp={() => {
              s.current.dragging = false
              setAnnounce(describe(s.current.plan, s.current.p))
            }}
            onInput={(e) => {
              if (s.current.playing) pause(false)
              seek(Number((e.target as HTMLInputElement).value) + 0.5)
            }}
            onKeyUp={() => setAnnounce(describe(s.current.plan, s.current.p))}
          />
        </label>
        <span className="wr-speed muted">Full week in 12&nbsp;s</span>
      </div>

      {ended && (
        <div className="wr-nudge" data-plan={ended}>
          {ended === 'asap' ? (
            <>
              <p>
                ASAP lost <span className="data">{usd.format(asap.overheatCost)}</span> to {asap.overheats.length} overheated
                zone-hours. Now watch the same six jobs scheduled by DC Router.
              </p>
              <button type="button" className="btn btn--primary" onClick={() => choosePlan('optimized', true)}>
                Replay with DC Router
              </button>
            </>
          ) : (
            <>
              <p>
                Same work, no overheats, <span className="data">{usd.format(SAVED)}</span> cheaper.
              </p>
              <button type="button" className="btn" onClick={() => choosePlan('asap', true)}>
                Replay ASAP
              </button>
            </>
          )}
        </div>
      )}

      <Summary plan={plan} variant={variant} />

      {variant === 'full' && (
        <ul className="wr-legend" aria-label="Legend">
          <li>
            <span className="wr-ramp" aria-hidden="true" />
            <span>
              Zone temperature, <span className="data">22</span> to <span className="data">{LIMIT}+</span>&nbsp;°C
            </span>
          </li>
          <li>
            <span className="wr-key wr-key--oh" aria-hidden="true" />
            <span>Overheat: above {LIMIT}&nbsp;°C, GPUs throttled</span>
          </li>
          <li>
            <span className="wr-key wr-key--cool" aria-hidden="true" />
            <span>Job takes a cooling unit offline</span>
          </li>
          <li>
            <span className="wr-key wr-key--task" aria-hidden="true" />
            <span>Other maintenance job</span>
          </li>
          <li>
            <span className="wr-key wr-key--price" aria-hidden="true" />
            <span>H100 forecast, daily, with low–high band</span>
          </li>
          <li className="muted">Monday and Tuesday are drawn wider; all six jobs land there.</li>
        </ul>
      )}

      <ScheduleTable plan={plan} />

      <p className="wr-source">
        Real output from the DC Router backend (seeded week, H100 prices from GetDeploying, CC&nbsp;BY&nbsp;4.0).
      </p>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}
