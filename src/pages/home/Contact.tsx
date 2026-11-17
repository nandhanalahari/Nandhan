import { useEffect, useRef, useState } from 'react'
import { LINKS, PROFILE } from '../../data'
import { useCosmosStop } from '../../cosmos/journey'
import { sideOf } from './stops'

type CopyState = 'idle' | 'copied' | 'failed'

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for insecure contexts and older browsers.
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  ta.remove()
  if (!ok) throw new Error('copy failed')
}

const SOCIAL = [
  { label: 'LinkedIn', href: LINKS.linkedin },
  { label: 'GitHub', href: LINKS.github },
  { label: 'Devpost', href: LINKS.devpost },
]

/** The pulsar: the last stop, where the visitor sends a signal back. */
export default function Contact() {
  const ref = useRef<HTMLElement>(null)
  useCosmosStop(ref, 'contact', sideOf('contact'), 0.35)
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onCopy = async () => {
    window.clearTimeout(timer.current)
    try {
      await copyText(LINKS.emailAddress)
      setState('copied')
    } catch {
      setState('failed')
    }
    timer.current = window.setTimeout(() => setState('idle'), 2400)
  }

  return (
    <section
      ref={ref}
      id="contact"
      className="stop stop--body-center contact"
      aria-labelledby="contact-title"
      tabIndex={-1}
    >
      <div className="stop__col contact__inner">
        <h2 id="contact-title" className="contact__title" data-reveal>
          Let’s build something.
        </h2>
        <p className="status contact__status">
          <span className="status__dot" aria-hidden="true" />
          {PROFILE.status}
        </p>

        <p className="contact__prompt muted">Send a signal</p>
        <div className="contact__email">
          <a href={LINKS.email} className="contact__address">
            {LINKS.emailAddress}
          </a>
          <button type="button" className="btn contact__copy" onClick={onCopy}>
            {state === 'copied' ? 'Copied' : 'Copy'}
            <span className="sr-only"> email address</span>
          </button>
        </div>
        <p className="contact__feedback" role="status" aria-live="polite">
          {state === 'copied' && <span className="sr-only">Copied</span>}
          {state === 'failed' && 'Couldn’t copy. Select the address above instead.'}
        </p>

        <ul className="contact__social">
          {SOCIAL.map((s) => (
            <li key={s.label}>
              <a href={s.href} className="link" target="_blank" rel="noopener noreferrer">
                {s.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
