import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GalleryArtist } from '../utils/gallery'
import { groupArtistsByLetter } from '../utils/gallery'

type ArtistDirectoryProps = {
  open: boolean
  artists: GalleryArtist[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
  onClose: () => void
}

export default function ArtistDirectory({
  open,
  artists,
  selectedSlug,
  onSelect,
  onClose,
}: ArtistDirectoryProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return artists
    return artists.filter((artist) =>
      artist.name.toLowerCase().includes(trimmed),
    )
  }, [artists, query])

  const groups = useMemo(() => groupArtistsByLetter(filtered), [filtered])
  const letters = groups.map((group) => group.letter)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="artist-directory" role="presentation">
      <button
        type="button"
        className="artist-directory__backdrop"
        aria-label="Close artist directory"
        onClick={onClose}
      />
      <div
        className="artist-directory__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="artist-directory__header">
          <div>
            <h2 id={titleId} className="artist-directory__title">
              Artists
            </h2>
            <p className="artist-directory__lede">
              Choose a name to see their photos across the years.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="artist-directory__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <label className="artist-directory__search">
          <span className="visually-hidden">Search artists</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artists"
            autoComplete="off"
          />
        </label>

        {letters.length > 1 ? (
          <nav className="artist-directory__letters" aria-label="Jump to letter">
            {letters.map((letter) => (
              <a key={letter} href={`#artist-letter-${letter}`}>
                {letter}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="artist-directory__list">
          {groups.length === 0 ? (
            <p className="artist-directory__empty">No artists match that search.</p>
          ) : (
            groups.map((group) => (
              <section
                key={group.letter}
                id={`artist-letter-${group.letter}`}
                className="artist-directory__group"
              >
                <h3 className="artist-directory__letter">{group.letter}</h3>
                <ul>
                  {group.artists.map((artist) => (
                    <li key={artist.slug}>
                      <button
                        type="button"
                        className={
                          artist.slug === selectedSlug
                            ? 'artist-directory__artist is-selected'
                            : 'artist-directory__artist'
                        }
                        onClick={() => onSelect(artist.slug)}
                      >
                        {artist.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
