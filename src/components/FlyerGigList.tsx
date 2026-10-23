import { useState, type CSSProperties } from 'react'
import GigDetailModal from './GigDetailModal'
import {
  formatTicketPrices,
  resolveGigDetails,
} from '../utils/gigDetails'
import { getGigMarkdown } from '../utils/gigMarkdown'
import { publicUrl } from '../utils/publicUrl'
import type { Gig } from '../gigs/types'

/** When true, "More details" opens the artist website if set; when false, always opens the modal. */
const preferArtistWebsite = true

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function FlyerGigList({
  gigs,
  showBooking = true,
}: {
  gigs: Gig[]
  showBooking?: boolean
}) {
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const selectedDetails = selectedGig ? resolveGigDetails(selectedGig) : null
  const selectedMarkdown = selectedGig
    ? selectedGig.bodyMarkdown?.trim() || getGigMarkdown(selectedGig.date)
    : null

  return (
    <>
      <ol className="flyer-list">
        {gigs.map((gig, index) => {
          const imagePath = gig.imagepath || undefined
          const details = resolveGigDetails(gig)

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
                    {showBooking &&
                    gig.ticketsAvailable !== false &&
                    gig.tickets ? (
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
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    decoding="async"
                  />
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {selectedGig && selectedDetails && (
        <GigDetailModal
          open
          name={selectedGig.name}
          details={selectedDetails}
          markdown={selectedMarkdown}
          tickets={
            showBooking && selectedGig.ticketsAvailable !== false
              ? selectedGig.tickets || undefined
              : undefined
          }
          ticketsAvailable={selectedGig.ticketsAvailable !== false}
          website={selectedGig.website || undefined}
          onClose={() => setSelectedGig(null)}
        />
      )}
    </>
  )
}
