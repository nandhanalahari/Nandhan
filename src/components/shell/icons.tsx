import type { SVGProps } from 'react'

/** Orbit mark: matches the favicon in index.html. */
export function OrbitMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <circle cx="16" cy="16" r="4" fill="var(--star)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--ion)" strokeWidth="1.5" opacity=".7" />
      <circle cx="25" cy="16" r="1.9" fill="var(--flare)" />
    </svg>
  )
}

type IconName = 'page' | 'project' | 'journey' | 'link' | 'copy' | 'mail' | 'search' | 'menu' | 'close'

const PATHS: Record<IconName, JSX.Element> = {
  page: (
    <>
      <path d="M4.5 2.75h5l2.75 2.75v7.75h-7.75z" />
      <path d="M9.5 2.75v2.75h2.75" />
    </>
  ),
  project: (
    <>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="6" ry="2.6" transform="rotate(-24 8 8)" />
    </>
  ),
  journey: (
    <>
      <path d="M2.75 12.75c1.2-4.6 4-7.4 8-8.4" />
      <circle cx="12.4" cy="3.9" r="1.6" />
      <path d="M2.75 12.75h.01" />
    </>
  ),
  link: (
    <>
      <path d="M6.75 9.25a2.5 2.5 0 0 0 3.54 0l2-2a2.5 2.5 0 0 0-3.54-3.54l-.6.6" />
      <path d="M9.25 6.75a2.5 2.5 0 0 0-3.54 0l-2 2a2.5 2.5 0 0 0 3.54 3.54l.6-.6" />
    </>
  ),
  copy: (
    <>
      <rect x="5.25" y="5.25" width="7.5" height="7.5" rx="1.5" />
      <path d="M10.75 3.25h-6a1.5 1.5 0 0 0-1.5 1.5v6" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="3.75" width="11" height="8.5" rx="1.5" />
      <path d="m3 4.5 5 4 5-4" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3 3" />
    </>
  ),
  menu: (
    <>
      <path d="M2.75 5.5h10.5" />
      <path d="M2.75 10.5h10.5" />
    </>
  ),
  close: (
    <>
      <path d="m4 4 8 8" />
      <path d="m12 4-8 8" />
    </>
  ),
}

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
