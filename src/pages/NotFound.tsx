import { Link } from 'react-router-dom'
import { useCosmosPark } from '../cosmos/journey'
import { useTitle } from '../hooks'
import './work.css'

function openPalette() {
  window.dispatchEvent(new CustomEvent('palette:open'))
}

export default function NotFound() {
  useTitle('Not found')
  // A lonely little moon, alone in the frame above the message.
  useCosmosPark('nestor', 'center', 0.2)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <section className="lost" aria-labelledby="lost-title">
      <div className="container lost__inner">
        <p className="lost__code data" aria-hidden="true">
          404
        </p>
        <h1 id="lost-title" className="lost__title">
          Lost in space.
        </h1>
        <p className="lost__line">
          Nothing is orbiting at this address. It may have moved, or it never existed. The rest of the site is right
          where you left it.
        </p>
        <div className="lost__actions">
          <Link to="/" className="btn btn--primary">
            Back home
          </Link>
          <Link to="/work" className="btn">
            See the work
          </Link>
        </div>
        <p className="lost__hint">
          Looking for something specific?{' '}
          <button type="button" className="lost__kbd-btn" onClick={openPalette}>
            <span className="lost__keys">
              Press <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd>
              <kbd>K</kbd> to search
            </span>
            <span className="lost__touch">Search the site</span>
          </button>
        </p>
      </div>
    </section>
  )
}
