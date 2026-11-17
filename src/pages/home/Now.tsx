import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { EXPERIENCE, NEWS } from '../../data'
import { useCosmosStop } from '../../cosmos/journey'
import { sideOf } from './stops'

const current = EXPERIENCE.filter((r) => r.current)
const latest = NEWS.slice(0, 4)

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']
const roleCount = `${COUNT_WORDS[current.length] ?? current.length} role${current.length === 1 ? '' : 's'}`

/** The young world: each moon is a role running right now. */
export default function Now() {
  const ref = useRef<HTMLElement>(null)
  useCosmosStop(ref, 'now', sideOf('now'), 0)

  return (
    <section ref={ref} id="now" className="stop stop--body-left now" aria-labelledby="now-title" tabIndex={-1}>
      <div className="stop__col">
        <div className="stop__panel">
          <header className="now__head" data-reveal>
            <h2 id="now-title" className="stop__title">
              Now
            </h2>
            <p className="now__lede muted">{roleCount} in orbit this semester, one moon each.</p>
          </header>

          <ul className="roles" aria-label="Current roles">
            {current.map((r) => (
              <li key={r.id} className="role">
                <span className="role__moon" aria-hidden="true" />
                <div>
                  <h3 className="role__title">{r.title}</h3>
                  <p className="role__org">
                    {r.org},{' '}
                    <span className="nowrap">
                      since <time className="data">{r.start}</time>
                    </span>
                  </p>
                  <p className="role__summary">{r.summary}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="news">
            <h3 className="news__title">Recently</h3>
            <ol className="news__list">
              {latest.map((n) => (
                <li key={`${n.date}-${n.title}`} className={`news__item${n.win ? ' is-win' : ''}`}>
                  <time className="news__date data">{n.date}</time>
                  <span className="news__text">
                    {n.win && (
                      <>
                        <span className="news__flare" aria-hidden="true" />
                        <span className="sr-only">Win: </span>
                      </>
                    )}
                    {n.href ? (
                      <Link to={n.href} className="news__link">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <Link to="/experience" className="cta-link now__more">
            Full experience
          </Link>
        </div>
      </div>
    </section>
  )
}
