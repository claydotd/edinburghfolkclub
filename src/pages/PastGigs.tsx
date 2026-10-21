import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FlyerGigList from '../components/FlyerGigList'
import { fetchGigs } from '../gigs/api'
import type { Gig } from '../gigs/types'
import { isPastGigDate } from '../gigs/types'

export default function PastGigs() {
  const [gigs, setGigs] = useState<Gig[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchGigs()
      .then((state) => {
        if (cancelled) return
        setGigs(state.gigs)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load gigs')
        setGigs([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pastGigs = (gigs ?? [])
    .filter((gig) => isPastGigDate(gig.date))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  return (
    <main className="flyer">
      <header className="flyer-masthead">
        <h1 className="page-title">Past gigs</h1>
        <p className="flyer-season">
          <Link to="/" className="flyer-more">
            &larr; Back to upcoming gigs
          </Link>
        </p>
      </header>

      {gigs === null ? (
        <p className="flyer-loading">Loading gigs…</p>
      ) : loadError ? (
        <p className="news-error" role="alert">
          {loadError}
        </p>
      ) : pastGigs.length === 0 ? (
        <p className="flyer-loading">No past gigs yet.</p>
      ) : (
        <FlyerGigList gigs={pastGigs} showBooking={false} />
      )}
    </main>
  )
}
