import { HOME_STOPS, type Side, type StopId } from '../../cosmos/journey'

/** Which side of the screen a stop's body sits on. Text goes opposite. */
export const sideOf = (id: StopId): Side => HOME_STOPS.find((s) => s.id === id)?.side ?? 'center'

/** The first world after the galaxy: where "See the work" lands. */
export const FIRST_WORLD: StopId = HOME_STOPS[1].id

/**
 * Scroll to a stop's section and keep the URL hash in step without adding
 * history entries. Focus follows, so keyboard and screen-reader users land
 * in the section they asked for.
 */
export function goToStop(id: StopId) {
  const el = document.getElementById(id)
  if (!el) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
  const hash = id === HOME_STOPS[0].id ? '' : `#${id}`
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`)
  el.focus({ preventScroll: true })
}
