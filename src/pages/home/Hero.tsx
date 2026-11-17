import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PROFILE } from '../../data'
import { useCosmosStop } from '../../cosmos/journey'
import { sideOf } from './stops'

const step = (i: number) => ({ '--i': i }) as CSSProperties

/** Fades for good once the page has moved: the cue has done its job. */
function ScrollCue() {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const onScroll = () => setGone(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <p className={`cue rise${gone ? ' is-gone' : ''}`} style={step(8)}>
      <span className="cue__track" aria-hidden="true">
        <span className="cue__bead" />
      </span>
      Scroll to dive in
    </p>
  )
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  useCosmosStop(ref, 'galaxy', sideOf('galaxy'), 0)
  const [first, ...rest] = PROFILE.name.split(' ')

  return (
    <section ref={ref} id="galaxy" className="hero hero--bare" aria-labelledby="hero-name" tabIndex={-1}>
      <div className="hero__inner">
        <div className="hero__copy">
          <h1 id="hero-name" className="hero__name">
            <span className="hero__mask">
              <span className="hero__word rise" style={step(1)}>
                {first}
              </span>
            </span>{' '}
            <span className="hero__mask">
              <span className="hero__word hero__word--light rise" style={step(2)}>
                {rest.join(' ')}
              </span>
            </span>
          </h1>
          <p className="sr-only">{PROFILE.pitch}</p>
        </div>
      </div>

      <ScrollCue />
    </section>
  )
}
