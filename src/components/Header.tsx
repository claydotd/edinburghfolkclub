import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import logo from '../assets/logo.webp'

const MOBILE_NAV_QUERY = '(max-width: 720px)'

const COMPACT_ENTER_Y = 120
const COMPACT_EXIT_Y = 8
const COMPACT_TRANSITION_MS = 350

export default function Header() {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(false)
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

  useLayoutEffect(() => {
    // Shrinking the sticky header shortens the page, and scroll anchoring
    // moves scrollY by about that same amount. A single threshold lets that
    // adjustment collapse and expand the header forever. The gap below is
    // wider than the shrink, and anchoring is paused during the transition.
    const root = document.documentElement
    const mobile = window.matchMedia(MOBILE_NAV_QUERY)
    let anchorTimer = 0

    function syncCompact() {
      const y = window.scrollY
      const next = mobile.matches
        ? false
        : compactRef.current
          ? y > COMPACT_EXIT_Y
          : y > COMPACT_ENTER_Y

      if (next === compactRef.current) return

      root.style.overflowAnchor = 'none'
      window.clearTimeout(anchorTimer)
      anchorTimer = window.setTimeout(() => {
        root.style.overflowAnchor = ''
      }, COMPACT_TRANSITION_MS)
      compactRef.current = next
      setCompact(next)
    }

    syncCompact()
    window.addEventListener('scroll', syncCompact, { passive: true })
    window.addEventListener('resize', syncCompact)
    mobile.addEventListener('change', syncCompact)
    return () => {
      window.removeEventListener('scroll', syncCompact)
      window.removeEventListener('resize', syncCompact)
      mobile.removeEventListener('change', syncCompact)
      window.clearTimeout(anchorTimer)
      root.style.overflowAnchor = ''
    }
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
    <header
      className={[
        'site-header',
        open ? 'header--nav-open' : '',
        compact ? 'header--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="nav-backdrop"
        aria-hidden="true"
        onClick={closeFromOverlay}
      />
      <div className="header-container">
        <div className="header-brand">
          <p className="header-tagline header-tagline--left">
            The home of traditional music in the capital since 1973
          </p>
          <Link to="/" className="logo-link" onClick={closeFromLink}>
            <img
              src={logo}
              alt="Edinburgh Folk Club"
              className="logo"
              width={500}
              height={233}
            />
          </Link>
          <p className="header-tagline header-tagline--right">
            Meetings at UCC <br />
            14 Royal Terrace EH7 5AB
          </p>
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
        </div>
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
            Home
          </NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/gallery">Gallery</NavLink>
          <NavLink to="/news">News</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/members">Members</NavLink>  
        </nav>
      </div>
    </header>
  )
}
