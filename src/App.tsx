import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Starfield from './components/Starfield'
import Intro from './components/Intro'
import { BootContext } from './boot'
import Home from './pages/Home'
import About from './pages/About'
import Projects from './pages/Projects'
import Experience from './pages/Experience'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const skipIntro = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [booted, setBooted] = useState(skipIntro)
  const [introGone, setIntroGone] = useState(skipIntro)

  useEffect(() => {
    const prev = history.scrollRestoration
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => {
      history.scrollRestoration = prev
    }
  }, [])

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
      <BootContext.Provider value={booted}>
        <div className={`app${booted ? '' : ' app--booting'}`}>
          <ScrollToTop />
          <Starfield />
          {!introGone && <Intro onReveal={() => setBooted(true)} onDone={() => setIntroGone(true)} />}
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/experience" element={<Experience />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BootContext.Provider>
    </BrowserRouter>
  )
}
