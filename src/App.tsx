import { lazy, Suspense, useEffect, useState } from 'react'
import Intro from './components/Intro'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import CommandPalette from './components/CommandPalette'
import Cosmos from './cosmos/Cosmos'
import { cosmos } from './cosmos/journey'
import { useRevealAll } from './hooks'
import Home from './pages/Home'

const Work = lazy(() => import('./pages/Work'))
const CaseStudy = lazy(() => import('./pages/CaseStudy'))
const Experience = lazy(() => import('./pages/Experience'))
const About = lazy(() => import('./pages/About'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteEffects() {
  const { pathname, hash } = useLocation()
  useRevealAll()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    // Deep links such as /#navrisk: jump once the (possibly lazy) page has rendered.
    let tries = 0
    let timer = 0
    const jump = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
      else if (tries++ < 20) timer = window.setTimeout(jump, 50)
    }
    jump()
    return () => window.clearTimeout(timer)
  }, [pathname, hash])
  return null
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [booted, setBooted] = useState(reducedMotion)
  const [introGone, setIntroGone] = useState(reducedMotion)

  // Tell the universe the jump is over, so the camera can ease out of it.
  useEffect(() => {
    if (booted) cosmos.arrive()
  }, [booted])

  useEffect(() => {
    if (booted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [booted])

  return (
    <BrowserRouter>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!introGone && <Intro onReveal={() => setBooted(true)} onDone={() => setIntroGone(true)} />}
      <div className={`app${booted ? '' : ' app--booting'}`}>
        <Cosmos />
        <RouteEffects />
        <Header />
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/work" element={<Work />} />
              <Route path="/work/:slug" element={<CaseStudy />} />
              <Route path="/experience" element={<Experience />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Navigate to="/work" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <CommandPalette />
      </div>
    </BrowserRouter>
  )
}
