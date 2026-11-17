const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function focusables(...roots: (HTMLElement | null)[]): HTMLElement[] {
  return roots
    .filter((r): r is HTMLElement => !!r)
    .flatMap((r) => Array.from(r.querySelectorAll<HTMLElement>(FOCUSABLE)))
    .filter((el) => el.getClientRects().length > 0)
}

/** Keep Tab / Shift+Tab cycling inside the given roots. Call from a keydown handler. */
export function trapTab(e: KeyboardEvent | React.KeyboardEvent, ...roots: (HTMLElement | null)[]) {
  if (e.key !== 'Tab') return
  const items = focusables(...roots)
  if (items.length === 0) {
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const current = document.activeElement as HTMLElement | null
  const inside = current ? items.includes(current) : false
  if (e.shiftKey && (current === first || !inside)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (current === last || !inside)) {
    e.preventDefault()
    first.focus()
  }
}

/** True when the keyboard event target is somewhere the user types text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'].includes(type)
  }
  return false
}

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = nav.userAgentData?.platform || navigator.platform || navigator.userAgent
  return /mac|iphone|ipad|ipod/i.test(platform)
}

export function openPalette() {
  window.dispatchEvent(new CustomEvent('palette:open'))
}
