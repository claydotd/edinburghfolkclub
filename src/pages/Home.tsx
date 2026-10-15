import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import GigDetailModal from '../components/GigDetailModal';
import {
  formatTicketPrices,
  resolveGigDetails,
} from '../utils/gigDetails';
import { getGigMarkdown } from '../utils/gigMarkdown';
import { publicUrl } from '../utils/publicUrl';
import NewsletterSignup from '../components/NewsletterSignup';
import HomeBanner from '../components/HomeBanner';
import Reveal from '../components/Reveal';
import { fetchGigs } from '../gigs/api';
import type { Gig } from '../gigs/types';
import { localDateString } from '../gigs/types';

/** When true, "More details" opens the artist website if set; when false, always opens the modal. */
const preferArtistWebsite = true;

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Home() {
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [gigs, setGigs] = useState<Gig[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGigs()
      .then((state) => {
        if (cancelled) return;
        setGigs(state.gigs);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load gigs');
        setGigs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingGigs = (gigs ?? []).filter(
    (gig) => gig.date >= localDateString(),
  );
  const selectedDetails = selectedGig
    ? resolveGigDetails(selectedGig)
    : null;
  const selectedMarkdown = selectedGig
    ? selectedGig.bodyMarkdown?.trim() || getGigMarkdown(selectedGig.date)
    : null;

  return (
    <>
    <HomeBanner />
    <main className="flyer">
      <Reveal variant="zoom" delay={40}>
      <div className="welcome">
        <div className="welcome-text">
          <span><em>Coming up at <strong><Link to="/contact#location" className="location-link">EFC, 14 Royal Terrace EH7 5AB</Link>. </strong></em></span>
          </div>
      </div>
      </Reveal>

      {gigs === null ? (
        <p className="flyer-loading">Loading gigs…</p>
      ) : loadError ? (
        <p className="news-error" role="alert">
          {loadError}
        </p>
      ) : upcomingGigs.length === 0 ? (
        <p className="flyer-loading">No upcoming gigs listed right now.</p>
      ) : (
      <ol className="flyer-list">
        {upcomingGigs.map((gig, index) => {
          const imagePath = gig.imagepath || undefined;
          const details = resolveGigDetails(gig);

          return (
            <li
              className={
                imagePath ? 'flyer-gig flyer-gig--featured' : 'flyer-gig'
              }
              key={gig.id}
              style={{ '--i': index } as CSSProperties}
            >
              <div className="flyer-body">
                <div className="flyer-copy">
                  <div className="flyer-header">
                  <time className="flyer-date" dateTime={gig.date}>
                      {formatDate(gig.date)}
                    </time>
                    <h2 className="flyer-name">{gig.name}</h2>
                  </div>
                  <p className="flyer-description">{gig.description}</p>
                  {gig.ticketsAvailable !== false ? (
                    <>
                      <p className="flyer-prices">
                        {formatTicketPrices(details.ticketPrices)}
                      </p>
                      <p>
                        <em className="flyer-prices-note">
                          *Tickets Scotland sales will incur a booking fee
                        </em>
                      </p>
                    </>
                  ) : (
                    <p className="flyer-prices">Tickets coming soon...</p>
                  )}
                  <div className="flyer-actions">
                    {preferArtistWebsite && gig.website ? (
                      <a
                        className="flyer-more"
                        href={gig.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More details
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="flyer-more"
                        onClick={() => setSelectedGig(gig)}
                      >
                        More details
                      </button>
                    )}
                    {gig.ticketsAvailable !== false && gig.tickets ? (
                      <a
                        className="flyer-tickets"
                        href={gig.tickets}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Book at Tickets Scotland
                      </a>
                    ) : null}
                  </div>
                </div>

                {imagePath && (
                  <img
                    className="flyer-image"
                    src={publicUrl(imagePath)}
                    alt=""
                    loading="lazy"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      )}

      {selectedGig && selectedDetails && (
        <GigDetailModal
          open
          name={selectedGig.name}
          details={selectedDetails}
          markdown={selectedMarkdown}
          tickets={
            selectedGig.ticketsAvailable !== false
              ? selectedGig.tickets || undefined
              : undefined
          }
          ticketsAvailable={selectedGig.ticketsAvailable !== false}
          website={selectedGig.website || undefined}
          onClose={() => setSelectedGig(null)}
        />
      )}
        <NewsletterSignup />
    </main>
    </>
  );
}
