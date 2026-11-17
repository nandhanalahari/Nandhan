import { useEffect, useState, type CSSProperties } from 'react'
import { HOME_STOPS, useActiveStop } from '../../cosmos/journey'

/**
 * Dev only (`?guides=1`): draws where the placement contract says the active
 * stop's body will be, so text can be checked against it before the 3D layer
 * exists.
 *
 *   >= 900px  right 71% / 50%, left 29% / 50%, center 50% / 40%, diameter min(58vh, 40vw)
 *   <  900px  50% / 27%, diameter min(56vw, 34vh)
 */
const viewport = () => ({ w: document.documentElement.clientWidth, h: window.innerHeight })

const layer: CSSProperties = { position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }
const ink = 'rgba(255, 94, 94, 0.95)'

export default function Guides() {
  const active = useActiveStop()
  const [vp, setVp] = useState(viewport)

  useEffect(() => {
    const onResize = () => setVp(viewport())
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const side = HOME_STOPS.find((s) => s.id === active)?.side ?? 'center'
  const wide = vp.w >= 900
  const d = wide ? Math.min(vp.h * 0.58, vp.w * 0.4) : Math.min(vp.w * 0.56, vp.h * 0.34)
  const cx = (wide ? (side === 'right' ? 0.71 : side === 'left' ? 0.29 : 0.5) : 0.5) * vp.w
  const cy = (wide ? (side === 'center' ? 0.4 : 0.5) : 0.27) * vp.h
  // The edge of the half that text may use (48% / 52%); none for centered stops.
  const limit = wide && side !== 'center' ? (side === 'right' ? 0.48 : 0.52) * vp.w : null

  return (
    <div style={layer} aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          left: cx - d / 2,
          top: cy - d / 2,
          width: d,
          height: d,
          borderRadius: '50%',
          border: `2px dashed ${ink}`,
        }}
      />
      {limit !== null && (
        <div style={{ position: 'absolute', left: limit, top: 0, bottom: 0, borderLeft: `1px dashed ${ink}`, opacity: 0.5 }} />
      )}
      <span
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          transform: 'translate(-50%, -50%)',
          color: ink,
          font: '500 12px/1.3 ui-monospace, Menlo, monospace',
          textAlign: 'center',
          whiteSpace: 'pre',
        }}
      >
        {`${active} (${side})\n${Math.round(d)}px @ ${Math.round(cx)}, ${Math.round(cy)}`}
      </span>
    </div>
  )
}
