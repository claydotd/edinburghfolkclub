import { useState, type CSSProperties } from 'react';
import gigs from '../../gigs/autumn2026.json';
import GigDetailModal from '../components/GigDetailModal';
import {
  formatTicketPrices,
  resolveGigDetails,
} from '../utils/gigDetails';
import { getGigMarkdown } from '../utils/gigMarkdown';
import { publicUrl } from '../utils/publicUrl';
import NewsletterSignup from '../components/NewsletterSignup';
import Reveal from '../components/Reveal';
type Gig = (typeof gigs.gigs)[number];

const gigsData = gigs.gigs;

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
  const selectedDetails = selectedGig
    ? resolveGigDetails(selectedGig)
    : null;
  const selectedMarkdown = selectedGig
    ? getGigMarkdown(selectedGig.date)
    : null;

  return (
    <main className="flyer">
      <Reveal variant="zoom" delay={40}>
      <div className="welcome">
        <h3>Welcome to the Edinburgh Folk Club est 1973</h3>
        <p>
          <em>Home to folk nights in the capital for over 50 years.</em>
        </p>
      </div>
      </Reveal>
      <Reveal variant="up" delay={80}>
      <header className="flyer-masthead">
        <h1 className="flyer-title">What's on?</h1>
          <p className="flyer-season">Autumn 2026</p>
        </header>
      </Reveal>
      <ol className="flyer-list">
        {gigsData.map((gig, index) => {
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
                    <h2 className="flyer-name">{gig.name}</h2>
                    <time className="flyer-date" dateTime={gig.date}>
                      {formatDate(gig.date)}
                    </time>
                    <p className="flyer-venue">{details.venue}</p>
                  </div>
                  <p className="flyer-description">{gig.description}</p>
                  <p className="flyer-prices">
                      {formatTicketPrices(details.ticketPrices)}
                    </p>
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
                        Tickets
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
          onClose={() => setSelectedGig(null)}
        />
      )}
        <NewsletterSignup />
    </main>
    
  );
}
