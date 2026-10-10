import { useReveal } from '../hooks'
import { EDUCATION, LINKS, SKILL_GROUPS, iconUrl } from '../data'

const FACTS = [
  { label: 'Location', value: 'Dallas, Texas' },
  { label: 'School', value: EDUCATION.school },
  { label: 'Degree', value: `${EDUCATION.degree}, ${EDUCATION.grad}` },
  { label: 'GPA', value: EDUCATION.gpa },
  { label: 'Focus', value: 'Machine Learning, Cognitive Tools, NLP' },
]

export default function About() {
  const ref = useReveal<HTMLElement>()
  return (
    <section className="page container" ref={ref}>
      <p className="page__crumb mono fade-up">~/about</p>
      <h1 className="page__title fade-up">About Me</h1>
      <p className="page__lede fade-up">
        Computer science student, researcher, and habitual puzzle-taker-aparter.
      </p>

      <div className="about fade-up">
        <div className="about__photo-wrap">
          <img
            src="/nandhan.png"
            alt="Nandhan Alahari"
            className="about__photo"
            loading="lazy"
          />
          <div className="about__facts">
            {FACTS.map((f) => (
              <div className="about__fact" key={f.label}>
                <span className="about__fact-label mono">{f.label}</span>
                <span className="about__fact-value">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="about__text">
          <h2 className="about__heading">The cube</h2>
          <p>
            I grew up in Celina, Texas, and the thing that rewired my brain was
            a Rubik's cube. My first solve took over two minutes of fumbling
            through memorized steps. Five hundred solves later I was under
            forty seconds, and the cube had not changed at all. The only thing
            that changed was the algorithm. That idea, that a better approach
            beats faster fingers, is why I do computer science. Years later I
            learned the formal name for it: time complexity. The cube taught
            it to me first.
          </p>

          <h2 className="about__heading">The work</h2>
          <p>
            Today I study computer science at UT Dallas with a 4.0, graduating
            December 2027. On the UTD EPICS team I am the software engineer for
            BeyondNeuro, a cognitive wellness platform for stroke survivors,
            dementia patients, and caregivers.             Last summer, in Dr. Zirong Gu's
            lab, I restored a stalled MATLAB clustering pipeline and built the
            video tooling that lets researchers see what each behavioral cluster
            actually is. The fall before that I spent a semester on ML for
            software security, obfuscating code and then measuring whether it
            held. Under Dr. Vincent Ng, I helped build MemeQA, a 9,000-question
            benchmark published at ACL 2025. This semester I am also building
            AskUTD with GDSC and SkyAlert with the AI Society.
          </p>

          <h2 className="about__heading">The builds</h2>
          <p>
            NavRisk, a crew-risk model trained on six million flight records,
            placed 1st out of 50+ teams at the EPPS x American Airlines Data
            Challenge, most of them graduate and PhD students. Kolana, a wallet
            you pay with by pointing a camera and speaking, won Best Use of
            Solana at HackHCC. Nestor, a scenario-driven portfolio rebalancer,
            finished top 5 at the Goldman Sachs & JSOM Hackathon.
          </p>

          <h2 className="about__heading">Skills</h2>
          <div className="skills">
            {SKILL_GROUPS.map((g) => (
              <div className="skills__group" key={g.label}>
                <p className="skills__label">{g.label}</p>
                <div className="pills">
                  {g.skills.map((s) => (
                    <span className="pill" key={s.name}>
                      {s.icon && (
                        <img
                          src={iconUrl(s.icon)}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h2 className="about__heading">Say hi</h2>
          <p>
            I'm always up for talking research, systems, startups, or
            speedcubing. My inbox is open.
          </p>
          <div className="hero__links">
            <a href={LINKS.email} className="chip-link">
              Email
            </a>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="chip-link">
              LinkedIn
            </a>
            <a href={LINKS.github} target="_blank" rel="noreferrer" className="chip-link">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
