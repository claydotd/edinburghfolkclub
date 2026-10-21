import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDeleteGig, adminListGigs } from '../../gigs/api'
import type { Gig } from '../../gigs/types'
import { formatGigDate, isPastGigDate } from '../../gigs/types'

export default function AdminGigsList({ archive = false }: { archive?: boolean }) {
  const [gigs, setGigs] = useState<Gig[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    adminListGigs()
      .then((list) => {
        if (!cancelled) {
          setGigs(list)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gigs')
          setGigs([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  async function onDelete(gig: Gig) {
    if (!window.confirm(`Delete “${gig.name}” (${gig.date})? This cannot be undone.`)) {
      return
    }
    setBusyId(gig.id)
    setError(null)
    try {
      await adminDeleteGig(gig.id)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const visible = (gigs ?? []).filter(
    (gig) => isPastGigDate(gig.date) === archive,
  )
  if (archive) visible.reverse()

  return (
    <main className="page admin-page">
      <header className="admin-page-header">
        <div>
          {archive ? (
            <Link to="/admin/gigs" className="admin-back-link">
              ← Upcoming gigs
            </Link>
          ) : null}
          <h1 className="page-title">{archive ? 'Past gigs' : 'Gigs'}</h1>
          <p className="page-lede">
            {archive
              ? 'Gigs whose date has passed are kept here.'
              : 'Manage upcoming gigs on the homepage.'}
          </p>
        </div>
        <div className="admin-header-actions">
          {archive ? null : (
            <Link to="/admin/gigs/archive" className="admin-secondary-link">
              Past gigs
            </Link>
          )}
          <Link to="/admin/gigs/new" className="admin-primary-link">
            New gig
          </Link>
        </div>
      </header>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      {gigs === null ? (
        <p className="admin-loading">Loading gigs…</p>
      ) : visible.length === 0 ? (
        <div className="admin-empty">
          <p className="page-lede">
            {archive ? 'No past gigs yet.' : 'No upcoming gigs.'}
          </p>
          {!archive && gigs.length === 0 ? (
            <Link to="/admin/gigs/new" className="admin-primary-link">
              Add the first gig
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="admin-post-list">
          {visible.map((gig) => (
            <li key={gig.id} className="admin-post-row">
              <div className="admin-post-meta">
                <Link to={`/admin/gigs/${gig.id}`} className="admin-post-title">
                  {gig.name}
                </Link>
                <span className="admin-post-slug">{formatGigDate(gig.date)}</span>
                <div className="admin-post-status-row">
                  {gig.imagepath ? (
                    <span className="admin-post-date">Has image</span>
                  ) : (
                    <span className="admin-post-date">No image</span>
                  )}
                </div>
              </div>
              <div className="admin-post-actions">
                <Link to={`/admin/gigs/${gig.id}`} className="admin-action-link">
                  Edit
                </Link>
                <button
                  type="button"
                  className="admin-action-btn admin-post-delete"
                  disabled={busyId === gig.id}
                  onClick={() => void onDelete(gig)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
