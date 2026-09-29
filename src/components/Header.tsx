import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'

const MOBILE_NAV_QUERY = '(max-width: 720px)'

export default function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_NAV_QUERY)
    const onChange = () => {
      if (!media.matches) setOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) {
      if (returnFocusRef.current) {
        returnFocusRef.current = false
        toggleRef.current?.focus()
      }
      return
    }

    closeRef.current?.focus()

    const { style } = document.body
    const previous = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      width: style.width,
    }
    const scrollY = window.scrollY
    style.overflow = 'hidden'
    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        returnFocusRef.current = true
        setOpen(false)
        return
      }

      if (event.key !== 'Tab' || !navRef.current) return

      const focusable = [
        ...navRef.current.querySelectorAll<HTMLElement>('a, button'),
      ]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      style.overflow = previous.overflow
      style.position = previous.position
      style.top = previous.top
      style.width = previous.width
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function toggleMenu() {
    setOpen((current) => {
      if (current) returnFocusRef.current = true
      return !current
    })
  }

  function closeFromLink() {
    returnFocusRef.current = false
    setOpen(false)
  }

  function closeFromOverlay() {
    returnFocusRef.current = true
    setOpen(false)
  }

  return (
    <header className={open ? 'site-header header--nav-open' : 'site-header'}>
      <div
        className="nav-backdrop"
        aria-hidden="true"
        onClick={closeFromOverlay}
      />
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo-link" onClick={closeFromLink}>
            <img src={logo} alt="Edinburgh Folk Club" className="logo" />
          </Link>
        </div>
        <div className="header-right">
          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={toggleMenu}
          >
            <span className="visually-hidden">
              {open ? 'Close menu' : 'Open menu'}
            </span>
            <span className="nav-toggle__bars" aria-hidden="true">
              <span className="nav-toggle__bar" />
              <span className="nav-toggle__bar" />
              <span className="nav-toggle__bar" />
            </span>
          </button>
          <nav
            ref={navRef}
            id="site-nav"
            className="nav-links"
            aria-label={open ? undefined : 'Main'}
            aria-labelledby={open ? 'site-nav-title' : undefined}
            role={open ? 'dialog' : undefined}
            aria-modal={open ? true : undefined}
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('a')) {
                closeFromLink()
              }
            }}
          >
            <div className="nav-drawer__top">
              <p id="site-nav-title" className="nav-drawer__title">
                Menu
              </p>
              <button
                ref={closeRef}
                type="button"
                className="nav-drawer__close"
                onClick={closeFromOverlay}
              >
                <span className="visually-hidden">Close menu</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="square"
                  />
                </svg>
              </button>
            </div>
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
