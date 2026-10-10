import { LINKS } from '../data'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="mono footer__sig">© {new Date().getFullYear()} Nandhan Alahari</p>
        <div className="footer__links">
          <a href={LINKS.email}>Email</a>
          <a href={LINKS.resume} target="_blank" rel="noreferrer">
            Resume
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
        <button
          type="button"
          className="mono footer__top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          back to top ↑
        </button>
      </div>
    </footer>
  )
}
