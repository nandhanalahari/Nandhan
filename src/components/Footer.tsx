import { LINKS } from '../data'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="mono footer__sig">nandhan alahari · {new Date().getFullYear()}</p>
        <div className="footer__links">
          <a href={LINKS.email}>Email</a>
          <a href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={LINKS.devpost} target="_blank" rel="noreferrer">
            Devpost
          </a>
        </div>
        <p className="mono footer__note">built with react · typescript · canvas</p>
      </div>
    </footer>
  )
}
