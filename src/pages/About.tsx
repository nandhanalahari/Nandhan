import { useReveal } from '../hooks'
import { EDUCATION, LINKS } from '../data'

const FACTS = [
  { label: 'Location', value: 'Dallas, Texas' },
  { label: 'School', value: EDUCATION.school },
  { label: 'Degree', value: `${EDUCATION.degree}, ${EDUCATION.grad}` },
  { label: 'GPA', value: EDUCATION.gpa },
  { label: 'Focus', value: 'Machine Learning, Neuroscience × AI, Systems' },
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
            Today I study computer science at UT Dallas with a 4.0 GPA, and I
            chase that same feeling across very different problems. In the
            computational neuroscience lab under Dr. Zirong Gu, I build the
            pipelines that turn hours of multi-camera animal footage into
            labeled behavioral sequences that researchers can actually analyze.
            In security research under the R.I.D.E. program, I wrote systems
            that obfuscate code and then trained models to attack it, because
            armor you have not measured is armor you should not trust. In NLP
            research, I helped build MemeQA, a 9,000-question benchmark
            published at ACL 2025 that shows how far multimodal models still
            are from genuinely understanding a meme.
          </p>

          <h2 className="about__heading">The builds</h2>
          <p>
            Outside of research I build fast at hackathons. NavRisk, a flight
            crew risk model trained on six million records, won the EPPS x
            American Airlines Data Challenge. Kolana, a wallet that lets you
            pay someone by pointing a camera at them and speaking, won Best Use
            of Solana at HackHCC. Nestor, a scenario-driven portfolio
            rebalancer, placed top six at the Goldman Sachs & JSOM Hackathon.
            Different puzzles, same instinct: find the structure, exploit it,
            cut the solve time.
          </p>

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
