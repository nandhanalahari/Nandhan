import { useRef } from 'react'
import { projectBySlug } from '../data'
import { HOME_STOPS } from '../cosmos/journey'
import { useTitle } from '../hooks'
import Hero from './home/Hero'
import Dive from './home/Dive'
import World, { AlsoInOrbit } from './home/World'
import Now from './home/Now'
import Principles from './home/Principles'
import Contact from './home/Contact'
import JourneyRail from './home/JourneyRail'
import Guides from './home/Guides'
import './home.css'

/** Every journey stop that is a project gets a world, in journey order, on the side the journey assigns. */
const WORLDS = HOME_STOPS.flatMap((s) => {
  const project = projectBySlug(s.id)
  return project ? [{ project, side: s.side }] : []
})

/** Dev only: `?guides=1` outlines where each stop's body will sit. */
const SHOW_GUIDES = import.meta.env.DEV && new URLSearchParams(window.location.search).get('guides') === '1'

export default function Home() {
  useTitle()
  const endRef = useRef<HTMLDivElement>(null)

  return (
    <div className="home">
      <Hero />
      <Dive />
      {WORLDS.map((w) => (
        <World key={w.project.slug} project={w.project} side={w.side} />
      ))}
      <AlsoInOrbit />
      <Now />
      <Principles />
      <Contact />
      <div ref={endRef} className="home__end" aria-hidden="true" />
      <JourneyRail endRef={endRef} />
      {SHOW_GUIDES && <Guides />}
    </div>
  )
}
