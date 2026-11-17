import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LINKS, PROJECTS, PUBLICATION } from '../data'
import { HOME_STOPS, useActiveStop, type StopId } from '../cosmos/journey'
import { Icon } from './shell/icons'
import { isTypingTarget, trapTab } from './shell/focus'
import { fuzzyMatch } from './shell/fuzzy'
import { lockScroll } from './shell/scrollLock'
import './shell.css'

type Run =
  | { kind: 'nav'; to: string }
  | { kind: 'journey'; stop: StopId }
  | { kind: 'external'; href: string }
  | { kind: 'copy' }
  | { kind: 'email' }

type IconName = 'page' | 'project' | 'journey' | 'link' | 'copy' | 'mail'

interface Item {
  id: string
  label: string
  sub?: string
  award?: string
  badge?: string
  keywords?: string
  icon: IconName
  run: Run
}

interface Group {
  id: string
  label: string
  items: Item[]
}

const host = (href: string) => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

const GROUPS: Group[] = [
  {
    id: 'nav',
    label: 'Navigate',
    items: [
      { id: 'home', label: 'Home', sub: 'Start here', icon: 'page', run: { kind: 'nav', to: '/' }, keywords: 'index landing' },
      { id: 'work', label: 'Work', sub: 'Projects and case studies', icon: 'page', run: { kind: 'nav', to: '/work' }, keywords: 'projects portfolio' },
      { id: 'experience', label: 'Experience', sub: 'Roles, labs, and research', icon: 'page', run: { kind: 'nav', to: '/experience' }, keywords: 'jobs resume cv' },
      { id: 'about', label: 'About', sub: 'Background and how I work', icon: 'page', run: { kind: 'nav', to: '/about' }, keywords: 'bio skills contact' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    items: PROJECTS.map((p) => ({
      id: `p-${p.slug}`,
      label: p.name,
      sub: p.tagline,
      award: p.award,
      badge: p.badge,
      icon: 'project' as const,
      run: { kind: 'nav' as const, to: `/work/${p.slug}` },
      keywords: [p.venue, p.year, ...p.stack].join(' '),
    })),
  },
  {
    // Every stop on the home page's scroll journey; the section ids equal the stop ids.
    id: 'journey',
    label: 'Journey',
    items: HOME_STOPS.map((s, i) => ({
      id: `j-${s.id}`,
      label: s.id === 'galaxy' ? 'Fly to the galaxy' : `Fly to ${s.label}`,
      sub: `Stop ${i + 1} of ${HOME_STOPS.length} on the home page`,
      icon: 'journey' as const,
      run: { kind: 'journey' as const, stop: s.id },
      keywords: `${s.id} ${s.label} journey scroll world planet universe`,
    })),
  },
  {
    id: 'links',
    label: 'Links',
    items: [
      { id: 'github', label: 'GitHub', sub: host(LINKS.github), icon: 'link', run: { kind: 'external', href: LINKS.github }, keywords: 'code source' },
      { id: 'linkedin', label: 'LinkedIn', sub: host(LINKS.linkedin), icon: 'link', run: { kind: 'external', href: LINKS.linkedin } },
      { id: 'devpost', label: 'Devpost', sub: host(LINKS.devpost), icon: 'link', run: { kind: 'external', href: LINKS.devpost }, keywords: 'hackathons' },
      { id: 'paper', label: 'MemeQA paper', sub: 'ACL Anthology', icon: 'link', run: { kind: 'external', href: PUBLICATION.href }, keywords: 'acl 2025 publication research' },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    items: [
      { id: 'copy', label: 'Copy email address', sub: LINKS.emailAddress, icon: 'copy', run: { kind: 'copy' }, keywords: 'contact clipboard' },
      { id: 'email', label: 'Send email', sub: 'Opens your mail app', icon: 'mail', run: { kind: 'email' }, keywords: 'contact mail hire' },
    ],
  },
]

interface Result {
  item: Item
  indices: number[]
}

function search(query: string): { group: Group; results: Result[] }[] {
  return GROUPS.map((group) => {
    const results = group.items
      .map((item) => {
        const m = fuzzyMatch(query, item.label, `${item.sub ?? ''} ${item.keywords ?? ''}`)
        return m ? { item, indices: m.indices, score: m.score } : null
      })
      .filter((r): r is Result & { score: number } => r !== null)
    if (query.trim()) results.sort((a, b) => b.score - a.score)
    return { group, results }
  }).filter((g) => g.results.length > 0)
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>
  const set = new Set(indices)
  const out: JSX.Element[] = []
  let i = 0
  while (i < text.length) {
    const hit = set.has(i)
    let j = i
    while (j < text.length && set.has(j) === hit) j++
    const chunk = text.slice(i, j)
    out.push(hit ? <mark key={i}>{chunk}</mark> : <span key={i}>{chunk}</span>)
    i = j
  }
  return <>{out}</>
}

interface DialogProps {
  onClose: () => void
  onToast: (message: string) => void
}

function PaletteDialog({ onClose, onToast }: DialogProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeStop = useActiveStop()
  const uid = useId()
  const listId = `${uid}-list`
  const optId = (id: string) => `${uid}-opt-${id}`

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => search(query), [query])
  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups])
  const activeIndex = flat.length ? Math.min(active, flat.length - 1) : -1
  const activeItem = activeIndex >= 0 ? flat[activeIndex].item : null

  // Focus the input on open; restore focus to whatever had it before.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    inputRef.current?.focus({ preventScroll: true })
    const unlock = lockScroll()
    return () => {
      unlock()
      if (previous && previous.isConnected && previous !== document.body) previous.focus({ preventScroll: true })
    }
  }, [])

  // Track the visual viewport so the sheet fits above an on-screen keyboard.
  useEffect(() => {
    const vv = window.visualViewport
    const el = dialogRef.current
    if (!vv || !el) return
    const sync = () => el.style.setProperty('--vvh', `${vv.height}px`)
    sync()
    vv.addEventListener('resize', sync)
    return () => vv.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (!activeItem) return
    if (activeIndex === 0 && listRef.current) {
      listRef.current.scrollTop = 0
      return
    }
    document.getElementById(optId(activeItem.id))?.scrollIntoView({ block: 'nearest' })
  }, [activeItem, activeIndex])

  const run = async (item: Item) => {
    const r = item.run
    switch (r.kind) {
      case 'nav':
        onClose()
        navigate(r.to)
        break
      case 'journey': {
        onClose()
        const el = pathname === '/' ? document.getElementById(r.stop) : null
        if (!el) {
          // From another page the router lands on the home page and App jumps to the hash.
          navigate(`/#${r.stop}`)
          break
        }
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.history.replaceState(window.history.state, '', `#${r.stop}`)
        // Scroll after the dialog has unmounted and released the scroll lock.
        requestAnimationFrame(() => el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }))
        break
      }
      case 'external':
        onClose()
        window.open(r.href, '_blank', 'noopener,noreferrer')
        break
      case 'email':
        onClose()
        window.location.href = LINKS.email
        break
      case 'copy':
        onClose()
        try {
          if (!navigator.clipboard) throw new Error('Clipboard unavailable')
          await navigator.clipboard.writeText(LINKS.emailAddress)
          onToast('Copied email address')
        } catch {
          onToast(`Couldn’t copy. It’s ${LINKS.emailAddress}`)
        }
        break
    }
  }

  const move = (to: number) => {
    if (!flat.length) return
    setActive(((to % flat.length) + flat.length) % flat.length)
  }

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        move(activeIndex + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        move(activeIndex - 1)
        break
      case 'Home':
        if (!flat.length) return
        e.preventDefault()
        move(0)
        break
      case 'End':
        if (!flat.length) return
        e.preventDefault()
        move(flat.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeItem) void run(activeItem)
        break
    }
  }

  const onDialogKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'Tab') {
      trapTab(e, dialogRef.current)
    }
  }

  let index = -1

  return (
    <div className="palette">
      <div className="palette__backdrop" aria-hidden="true" onMouseDown={onClose} />
      <div
        ref={dialogRef}
        className="palette__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        onKeyDown={onDialogKey}
      >
        <div className="palette__field">
          <span className="palette__search-icon">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            className="palette__input"
            type="text"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listId}
            aria-activedescendant={activeItem ? optId(activeItem.id) : undefined}
            aria-autocomplete="list"
            aria-label="Search pages, projects, and links"
            placeholder="Search pages, projects, and links…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onInputKey}
          />
          <button type="button" className="palette__close" onClick={onClose} aria-label="Close command menu">
            <kbd>esc</kbd>
          </button>
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="palette__list">
          {groups.length === 0 ? (
            <p className="palette__empty" role="presentation">
              No results for “{query.trim()}”
            </p>
          ) : (
            groups.map(({ group, results }) => (
              <div key={group.id} role="group" aria-labelledby={`${uid}-g-${group.id}`} className="palette__group">
                <div id={`${uid}-g-${group.id}`} role="presentation" className="palette__group-label">
                  {group.label}
                </div>
                {results.map(({ item, indices }) => {
                  index++
                  const i = index
                  const selected = i === activeIndex
                  const current = item.run.kind === 'nav' && item.run.to === pathname
                  const here = item.run.kind === 'journey' && pathname === '/' && item.run.stop === activeStop
                  return (
                    <div
                      key={item.id}
                      id={optId(item.id)}
                      role="option"
                      aria-selected={selected}
                      className={`palette__option${selected ? ' is-active' : ''}`}
                      onMouseMove={() => i !== activeIndex && setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void run(item)}
                    >
                      <span className={`palette__icon palette__icon--${item.icon}`} aria-hidden="true">
                        <Icon name={item.icon} />
                      </span>
                      <span className={`palette__text${item.award ? ' palette__text--stack' : ''}`}>
                        <span className="palette__head">
                          <span className="palette__label">
                            <Highlight text={item.label} indices={indices} />
                          </span>
                          {item.award && (
                            <span className="palette__award">
                              <span className="palette__award-full">{item.award}</span>
                              <span className="palette__award-short" aria-hidden="true">
                                {item.badge}
                              </span>
                            </span>
                          )}
                        </span>
                        {item.sub && <span className="palette__sub">{item.sub}</span>}
                      </span>
                      {current && <span className="palette__hint">Current page</span>}
                      {here && <span className="palette__hint">You’re here</span>}
                      {item.run.kind === 'external' && <span className="sr-only">(opens in a new tab)</span>}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="palette__foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            <kbd>esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}

const devOpen = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('palette')

export default function CommandPalette() {
  const [open, setOpen] = useState(devOpen)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const k = e.key.toLowerCase()
      if (k === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('palette:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('palette:open', onOpen)
    }
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const close = useCallback(() => setOpen(false), [])
  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  return (
    <>
      {open && <PaletteDialog onClose={close} onToast={showToast} />}
      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  )
}
