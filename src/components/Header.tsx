import { Link, NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function Header() {
  return (
    <header>
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo-link">
            <img src={logo} alt="Edinburgh Folk Club" className="logo" />
          </Link>
        </div>
        <div className="header-right">
          <nav className="nav-links" aria-label="Main">
            <NavLink to="/" end>
              What&apos;s on?
            </NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/gallery">Gallery</NavLink>
            <NavLink to="/other-folk">Other Folk</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/members">Members</NavLink>
          </nav>
        </div>
      </div>
    </header>
  )
}
