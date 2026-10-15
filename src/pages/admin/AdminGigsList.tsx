import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDeleteGig, adminListGigs } from '../../gigs/api'
import type { Gig } from '../../gigs/types'
import { formatGigDate, isPastGigDate } from '../../gigs/types'

export default function AdminGigsList() {
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

  const pastCount = gigs?.filter((g) => isPastGigDate(g.date)).length ?? 0

  return (
    <main className="page admin-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Gigs</h1>
          <p className="page-lede">
            Manage the homepage gig list.
          </p>
        </div>
        <Link to="/admin/gigs/new" className="admin-primary-link">
          New gig
        </Link>
      </header>

      {pastCount > 0 ? (
        <p className="admin-gig-past-banner" role="status">
          {pastCount === 1
            ? '1 past gig should be deleted from the list.'
            : `${pastCount} past gigs should be deleted from the list.`}
        </p>
      ) : null}

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      {gigs === null ? (
        <p className="admin-loading">Loading gigs…</p>
      ) : gigs.length === 0 ? (
        <div className="admin-empty">
          <p className="page-lede">No gigs yet.</p>
          <Link to="/admin/gigs/new" className="admin-primary-link">
            Add the first gig
          </Link>
        </div>
      ) : (
        <ul className="admin-post-list">
          {gigs.map((gig) => {
            const past = isPastGigDate(gig.date)
            return (
              <li
                key={gig.id}
                className={`admin-post-row${past ? ' admin-gig-row--past' : ''}`}
              >
                <div className="admin-post-meta">
                  <Link to={`/admin/gigs/${gig.id}`} className="admin-post-title">
                    {gig.name}
                  </Link>
                  <span className="admin-post-slug">{formatGigDate(gig.date)}</span>
                  <div className="admin-post-status-row">
                    {past ? (
                      <span className="admin-post-status is-past">
                        Past: please delete
                      </span>
                    ) : (
                      <span className="admin-post-status is-published">Upcoming</span>
                    )}
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
            )
          })}
        </ul>
      )}
    </main>
  )
}
