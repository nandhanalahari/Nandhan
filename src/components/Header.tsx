import { Link, NavLink } from 'react-router-dom'
import { LINKS } from '../data'

export default function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo mono">
          nandhan<span className="cursor-blink">▍</span>
        </Link>
        <nav className="header__nav">
          <NavLink to="/about">About</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/experience">Experience</NavLink>
          <a href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}
