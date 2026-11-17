import { useEffect, useRef } from 'react'
import { cosmos, type Side, type StopId } from './journey'
import './cosmos.css'

const STOPS: StopId[] = ['galaxy', 'system', 'dc-router', 'navrisk', 'kolana', 'memeqa', 'nestor', 'now', 'principles', 'contact']
const asStop = (s: string | null) => (s && (STOPS as string[]).includes(s) ? (s as StopId) : null)
const asSide = (s: string | null): Side => (s === 'left' || s === 'right' ? s : 'center')

/**
 * QA hooks: `?stop=<id>&side=&dim=` pins the camera at a world;
 * `?from=<id>&to=<id>&t=0..1` pins an in-between pose; `&solo=1` hides the page.
 * Returns true when pinned.
 */
function readPins(): boolean {
  const q = new URLSearchParams(window.location.search)
  if (q.get('solo') === '1') document.documentElement.dataset.cosmosSolo = ''
  const dim = Math.min(1, Math.max(0, Number(q.get('dim')) || 0))
  const stop = asStop(q.get('stop'))
  if (stop) {
    cosmos.glance(stop, asSide(q.get('side')), dim)
    return true
  }
  const from = asStop(q.get('from'))
  const to = asStop(q.get('to'))
  if (from && to) {
    cosmos.pin({ from, to, t: Number(q.get('t')) || 0, fromSide: asSide(q.get('fromSide')), toSide: asSide(q.get('toSide')), dim, journey: true })
    return true
  }
  return false
}

/**
 * The universe behind every page. The container (and its CSS nebula) paints
 * immediately; three.js loads as its own chunk afterwards.
 */
export default function Cosmos() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pinned = readPins()
    const el = ref.current
    if (!el) return
    let stop: (() => void) | undefined
    let cancelled = false
    import('./engine')
      .then(({ startCosmos }) => {
        if (!cancelled) stop = startCosmos(el, { instant: pinned })
      })
      .catch(() => {
        /* no WebGL / chunk failed: the CSS nebula stays */
      })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])

  return (
    <div ref={ref} className="cosmos" aria-hidden="true">
      <div className="cosmos__nebula" />
    </div>
  )
}
