import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FlyerGigList from '../components/FlyerGigList'
import NewsletterSignup from '../components/NewsletterSignup'
import HomeBanner from '../components/HomeBanner'
import Reveal from '../components/Reveal'
import { fetchGigs } from '../gigs/api'
import type { Gig } from '../gigs/types'
import { isPastGigDate } from '../gigs/types'

export default function Home() {
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

  const upcomingGigs = (gigs ?? []).filter((gig) => !isPastGigDate(gig.date))

  return (
    <>
      <HomeBanner />
      <main className="flyer">
        <Reveal variant="zoom" delay={40}>
          <div className="welcome">
            <div className="welcome-text">
              <span>
                <em>
                  Coming up at{' '}
                  <strong>
                    <Link to="/contact#location" className="location-link">
                      EFC, Ukrainian Community Centre, 14&nbsp;Royal&nbsp;Terrace EH7&nbsp;5AB
                    </Link>
                    .{' '}
                  </strong>
                </em>
              </span>
            </div>
          </div>
        </Reveal>

        {gigs === null ? (
          <p className="flyer-loading">Loading gigs…</p>
        ) : loadError ? (
          <p className="news-error" role="alert">
            {loadError}
          </p>
        ) : (
          <>
            {upcomingGigs.length === 0 ? (
              <p className="flyer-loading">No upcoming gigs listed right now.</p>
            ) : (
              <FlyerGigList gigs={upcomingGigs} />
            )}
            <p className="flyer-archive">
              <Link to="/past-gigs" className="flyer-archive-link">
                See Past Gigs
              </Link>
            </p>
          </>
        )}

        <NewsletterSignup />
      </main>
    </>
  )
}
