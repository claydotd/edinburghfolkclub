import { type FormEvent, useEffect, useState } from 'react'
import { formatGigDate } from '../../gigs/types'
import {
  fetchMemberReservations,
  reserveMemberGigs,
} from '../../membership/api'
import type { MemberReservations } from '../../membership/types'
import { isNewsDemo } from '../../news/api'

const CANCEL_MAILTO = 'mailto:members@efc1973.com'

export default function MembersTickets() {
  const demo = isNewsDemo()
  const [reservations, setReservations] = useState<MemberReservations | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (demo) return
    let cancelled = false
    fetchMemberReservations()
      .then((data) => {
        if (!cancelled) {
          setReservations(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gigs')
          setReservations({ available: [], reserved: [] })
        }
      })
    return () => {
      cancelled = true
    }
  }, [demo])

  function toggleGig(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((gigId) => gigId !== id) : [...current, id],
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (selected.length === 0) {
      setError('Choose a gig to reserve')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await reserveMemberGigs(selected)
      setReservations(data)
      setSelected([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reservation failed')
    } finally {
      setBusy(false)
    }
  }

  if (demo) {
    return (
      <main className="page members-tickets">
        <header className="page-masthead">
          <h1 className="page-title">Members’ tickets</h1>
          <p className="page-lede">
            Ticket reservations are stored on the Netlify site. This preview
            does not keep reservations.
          </p>
        </header>
      </main>
    )
  }

  const available = reservations?.available ?? []
  const reserved = reservations?.reserved ?? []

  return (
    <main className="page members-tickets">
      <header className="page-masthead">
        <h1 className="page-title">Members’ tickets</h1>
        <p className="page-lede">
          Reserve members’-price tickets for an upcoming night.
        </p>
        <p className="members-ticket-cancel">
          <em>Can't go to a gig you reserved? email <a href={CANCEL_MAILTO}>members@efc1973.com</a> to cancel.</em>
        </p>
      </header>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      {reservations === null ? (
        <p className="admin-loading">Loading gigs…</p>
      ) : (
        <>
          <section className="members-ticket-reserve" aria-labelledby="reserve-heading">
            <h2 id="reserve-heading">Reserve a ticket</h2>
            {available.length === 0 ? (
              <p>
                {reserved.length === 0
                  ? 'No upcoming gigs to reserve.'
                  : 'You have reserved every upcoming gig.'}
              </p>
            ) : (
              <form className="site-form" onSubmit={onSubmit}>
                <fieldset className="members-ticket-fieldset">
                  <legend>Upcoming gigs</legend>
                  <ul className="members-ticket-gigs">
                    {available.map((gig) => (
                      <li key={gig.id}>
                        <label>
                          <input
                            type="checkbox"
                            name="gigIds"
                            value={gig.id}
                            checked={selected.includes(gig.id)}
                            onChange={() => toggleGig(gig.id)}
                          />
                          <span>
                            {gig.name}
                            <span className="members-ticket-date">
                              {formatGigDate(gig.date)}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <button type="submit" className="form-submit" disabled={busy}>
                  {busy ? 'Reserving…' : 'Reserve tickets'}
                </button>
              </form>
            )}
          </section>

          <section className="members-ticket-reserved" aria-labelledby="reserved-heading">
            <h2 id="reserved-heading">Your reservations</h2>
            {reserved.length === 0 ? (
              <p>You have not reserved any upcoming gigs.</p>
            ) : (
              <ul className="members-reserved-list">
                {reserved.map((gig) => (
                  <li key={gig.id}>
                    <span className="members-reserved-name">{gig.name}</span>
                    <span className="members-ticket-date">{formatGigDate(gig.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
