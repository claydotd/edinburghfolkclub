import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import gigs from '../../gigs/autumn2026.json';
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
type Gig = (typeof gigs.gigs)[number];

const gigsData = gigs.gigs;

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Home() {
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const upcomingGigs = gigsData.filter((gig) => gig.date >= localDateString());
  const selectedDetails = selectedGig
    ? resolveGigDetails(selectedGig)
    : null;
  const selectedMarkdown = selectedGig
    ? getGigMarkdown(selectedGig.date)
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
      <ol className="flyer-list">
        {upcomingGigs.map((gig, index) => {
          const imagePath =
            'imagepath' in gig && typeof gig.imagepath === 'string'
              ? gig.imagepath
              : undefined;
          const details = resolveGigDetails(gig);

          return (
            <li
              className={
                imagePath ? 'flyer-gig flyer-gig--featured' : 'flyer-gig'
              }
              key={gig.date}
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
                  <p className="flyer-prices">
                      {formatTicketPrices(details.ticketPrices)}
                    </p>
                    <p><em className="flyer-prices-note">*Tickets Scotland sales will incur a booking fee</em></p>
                  <div className="flyer-actions">
                    <button
                      type="button"
                      className="flyer-more"
                      onClick={() => setSelectedGig(gig)}
                    >
                      More details
                    </button>
                    {'tickets' in gig && gig.tickets && (
                      <a
                        className="flyer-tickets"
                        href={gig.tickets}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Book at Tickets Scotland
                      </a>
                    )}
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

      {selectedGig && selectedDetails && (
        <GigDetailModal
          open
          name={selectedGig.name}
          details={selectedDetails}
          markdown={selectedMarkdown}
          tickets={
            'tickets' in selectedGig ? selectedGig.tickets : undefined
          }
          website={
            'website' in selectedGig ? selectedGig.website : undefined
          }
          onClose={() => setSelectedGig(null)}
        />
      )}
        <NewsletterSignup />
    </main>
    </>
  );
}
