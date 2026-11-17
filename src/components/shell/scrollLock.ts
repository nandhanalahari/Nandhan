/**
 * Reference-counted body scroll lock shared by the mobile menu and the
 * command palette, so closing one never unlocks scroll the other still needs.
 */
let count = 0
let saved: { overflow: string; paddingRight: string } | null = null

export function lockScroll(): () => void {
  const root = document.documentElement
  if (count === 0) {
    const gap = window.innerWidth - root.clientWidth
    saved = { overflow: root.style.overflow, paddingRight: document.body.style.paddingRight }
    root.style.overflow = 'hidden'
    root.style.setProperty('--scrollbar-gap', `${Math.max(0, gap)}px`)
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
  }
  count++
  let released = false
  return () => {
    if (released) return
    released = true
    count--
    if (count === 0 && saved) {
      root.style.overflow = saved.overflow
      document.body.style.paddingRight = saved.paddingRight
      root.style.removeProperty('--scrollbar-gap')
      saved = null
    }
  }
}
