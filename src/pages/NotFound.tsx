import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const SITE_TITLE = 'Edinburgh Folk Club'

export default function NotFound() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `Page not found — ${SITE_TITLE}`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.append(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])

  return (
    <main className="page not-found">
      <header className="page-masthead">
        <p className="not-found-code" aria-hidden="true">
          404
        </p>
        <h1 className="page-title">Page not found</h1>
        <p className="page-lede">This page could not be found.</p>
      </header>
      <p className="not-found-actions">
        <Link to="/" className="flyer-archive-link">
          Back to the homepage
        </Link>
      </p>
    </main>
  )
}
