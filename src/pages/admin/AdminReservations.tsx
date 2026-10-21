import { useEffect, useState } from 'react'
import { formatGigDate } from '../../gigs/types'
import { adminListReservations, adminRemoveReservation } from '../../membership/api'
import type { AdminGigReservations } from '../../membership/types'
import { isNewsDemo } from '../../news/api'

function reservedLabel(count: number): string {
  return count === 1 ? '1 reserved' : `${count} reserved`
}

export default function AdminReservations() {
  const [gigs, setGigs] = useState<AdminGigReservations[] | null>(null)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNewsDemo()) return
    let cancelled = false
    adminListReservations()
      .then((list) => {
        if (!cancelled) {
          setGigs(list)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reservations')
          setGigs([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleGig(id: string) {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((gigId) => gigId !== id) : [...current, id],
    )
  }

  async function onRemove(gigId: string, memberId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this gig?`)) return
    setBusy(true)
    setError(null)
    try {
      setGigs(await adminRemoveReservation(gigId, memberId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  if (isNewsDemo()) {
    return (
      <main className="page admin-page">
        <header className="admin-page-header">
          <div>
            <h1 className="page-title">Reservations</h1>
            <p className="page-lede">
              Ticket reservations are stored on the Netlify site. This preview
              does not have a shared list.
            </p>
          </div>
        </header>
      </main>
    )
  }

  return (
    <main className="page admin-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Reservations</h1>
          <p className="page-lede">
            Upcoming gigs and who has reserved a members’ ticket.
          </p>
        </div>
      </header>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      {gigs === null ? (
        <p className="admin-loading">Loading reservations…</p>
      ) : gigs.length === 0 ? (
        <div className="admin-empty">
          <p className="page-lede">No upcoming gigs.</p>
        </div>
      ) : (
        <ul className="admin-reservation-list">
          {gigs.map((gig) => {
            const open = openIds.includes(gig.id)
            return (
              <li key={gig.id} className="admin-reservation-item">
                <button
                  type="button"
                  className="admin-reservation-toggle"
                  aria-expanded={open}
                  onClick={() => toggleGig(gig.id)}
                >
                  <span className="admin-reservation-mark" aria-hidden="true">
                    {open ? '−' : '+'}
                  </span>
                  <span className="admin-reservation-summary">
                    <span className="admin-reservation-name">{gig.name}</span>
                    <span className="admin-reservation-date">
                      {formatGigDate(gig.date)}
                    </span>
                  </span>
                  <span className="admin-reservation-count">{reservedLabel(gig.count)}</span>
                </button>
                {open ? (
                  gig.members.length === 0 ? (
                    <p className="admin-reservation-empty">Nobody has reserved yet.</p>
                  ) : (
                    <ul className="admin-reservation-people">
                      {gig.members.map((member) => (
                        <li key={member.id}>
                          <span className="admin-reservation-person">
                            <span>{member.name}</span>
                            <button
                              type="button"
                              className="admin-action-btn"
                              onClick={() => void onRemove(gig.id, member.id, member.name)}
                              disabled={busy}
                            >
                              Remove
                            </button>
                          </span>
                          <a href={`mailto:${member.email}`}>{member.email}</a>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
