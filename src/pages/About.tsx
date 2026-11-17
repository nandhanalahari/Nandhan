import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { LINKS, PROFILE, SKILLS } from '../data'
import { useCosmosStop } from '../cosmos/journey'
import { useTitle } from '../hooks'
import './profile.css'

const FACTS = [
  { term: 'Based in', value: PROFILE.location },
  { term: 'School', value: PROFILE.school },
  { term: 'Degree', value: `${PROFILE.degree}, ${PROFILE.grad}` },
  { term: 'GPA', value: PROFILE.gpa, data: true },
]

const ELSEWHERE = [
  { label: 'LinkedIn', href: LINKS.linkedin },
  { label: 'GitHub', href: LINKS.github },
  { label: 'Devpost', href: LINKS.devpost },
]

export default function About() {
  useTitle('About')
  const heroRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // The galaxy holds beside the headline, then recedes behind the story.
  useCosmosStop(heroRef, 'galaxy', 'right', 0.15)
  useCosmosStop(bodyRef, 'galaxy', 'right', 0.8)

  return (
    <div className="profile">
      <header className="phero" ref={heroRef}>
        <div className="container phero__inner">
          <h1 className="phero__title about-hero__title">Better algorithms, not faster hands.</h1>
          <p className="phero__lede">
            I’m Nandhan, a computer science student at UT Dallas who builds machine learning systems and the software
            that makes them usable. A Rubik’s cube is the reason why.
          </p>
        </div>
      </header>

      <div className="pbody" ref={bodyRef}>
      <div className="container about">
        <aside className="about__aside" aria-label="Quick facts">
          <figure className="portrait">
            <img
              src="/nandhan.png"
              width={800}
              height={800}
              decoding="async"
              alt="Portrait of Nandhan Alahari"
            />
          </figure>
          <dl className="facts">
            {FACTS.map((f) => (
              <div className="facts__row" key={f.term}>
                <dt>{f.term}</dt>
                <dd className={f.data ? 'facts__gpa data' : undefined}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <div className="about__main">
          <article className="story">
            <section className="asec" aria-labelledby="story-cube">
              <h2 id="story-cube">The cube</h2>
              <div className="asec__body">
              <p>
                I grew up in Celina, Texas, and a Rubik’s cube rewired how I think. My first solve took over two
                minutes of fumbling through memorized steps. Five hundred solves later I was under forty seconds,
                and the cube hadn’t changed at all. Only the algorithm had. Years later I learned the formal name
                for that idea, time complexity, but the cube taught it to me first. It’s still why I do computer
                science.
              </p>
              </div>
            </section>

            <section className="asec" aria-labelledby="story-work">
              <h2 id="story-work">The work</h2>
              <div className="asec__body">
              <p>
                I study computer science at UT Dallas with a 4.0, graduating December 2027, and spend most of my
                time where research meets shipping software. Right now I’m the software engineer and project liaison
                for BeyondNeuro on UTD EPICS, a cognitive wellness platform for stroke survivors, dementia patients,
                and caregivers. I’m also building AskUTD with Google Developer Groups and SkyAlert with the AI
                Society.
              </p>
              <p>
                This past summer, in Dr. Zirong Gu’s lab, I restored a stalled MATLAB clustering pipeline and built
                the video tooling that shows researchers what each behavioral cluster actually is. Before that came
                a semester of machine learning for software security, and MemeQA, a 9,000-question benchmark built
                in Dr. Vincent Ng’s lab and published at ACL&nbsp;2025.{' '}
                <Link className="link" to="/experience">
                  The full timeline
                </Link>{' '}
                has the details.
              </p>
              </div>
            </section>

            <section className="asec" aria-labelledby="story-builds">
              <h2 id="story-builds">The builds</h2>
              <div className="asec__body">
              <p>
                <Link className="link" to="/work/dc-router">
                  DC Router
                </Link>{' '}
                took 2nd place in the NMC² track at HackUTD 2026. It schedules GPU data-center maintenance priced in
                real H100 market dollars: a thermal simulator checks every slot, and a Nemotron agent turns plain
                requests into plans. The result runs <strong>42.8% cheaper</strong> than as-soon-as-possible
                scheduling, with <strong>zero overheats</strong>.
              </p>
              <p>
                <Link className="link" to="/work/navrisk">
                  NavRisk
                </Link>
                , a crew-risk model trained on six million flight records, placed 1st of 50+ teams at the EPPS ×
                American Airlines Data Challenge, against mostly graduate and PhD students.{' '}
                <Link className="link" to="/work/kolana">
                  Kolana
                </Link>
                , a wallet you pay with by pointing a camera and speaking, won Best Use of Solana at HackHCC.{' '}
                <Link className="link" to="/work/nestor">
                  Nestor
                </Link>
                , a scenario-driven portfolio rebalancer, finished top 5 at the Goldman Sachs & JSOM Hackathon.
              </p>
              </div>
            </section>
          </article>

          <section className="asec toolkit" aria-labelledby="toolkit-title">
            <h2 id="toolkit-title">Toolkit</h2>
            <div className="toolkit__groups">
              {SKILLS.map((g) => (
                <div className="toolkit__group" key={g.group}>
                  <h3>{g.group}</h3>
                  <ul className="tags">
                    {g.items.map((s) => (
                      <li className="tag" key={s}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="asec hi" aria-labelledby="hi-title">
            <h2 id="hi-title">Say hi</h2>
            <div className="asec__body">
            <p>I’m always up for talking research, systems, startups, or speedcubing. My inbox is open.</p>
            <div className="hi__links">
              <a className="btn btn--primary" href={LINKS.email}>
                {LINKS.emailAddress}
              </a>
              {ELSEWHERE.map((l) => (
                <a className="btn" key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  )
}
