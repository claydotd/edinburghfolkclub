import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { RowsPhotoAlbum } from 'react-photo-album'
import 'react-photo-album/rows.css'
import ArtistDirectory from '../components/ArtistDirectory'
import {
  gallery,
  photoIncludesArtist,
  photosByYear,
  toAlbumPhotos,
} from '../utils/gallery'
import { publicUrl } from '../utils/publicUrl'
import Reveal from '../components/Reveal'

type BrowseMode = 'year' | 'artist'

function yearSectionId(year: string) {
  return `gallery-year-${year}`
}

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [activeYear, setActiveYear] = useState<string | null>(null)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const deepLinkedYear = useRef(false)

  const artistParam = searchParams.get('artist')
  const yearParam = searchParams.get('year')

  const mode: BrowseMode = artistParam ? 'artist' : 'year'
  const selectedArtist =
    gallery.artists.find((artist) => artist.slug === artistParam) ?? null

  const years = gallery.years
  const yearPhotoMap = useMemo(() => photosByYear(gallery.photos), [])

  const artistPhotos = useMemo(() => {
    if (!selectedArtist) return []
    return toAlbumPhotos(
      gallery.photos.filter((photo) =>
        photoIncludesArtist(photo, selectedArtist.slug),
      ),
      publicUrl,
    )
  }, [selectedArtist])

  useEffect(() => {
    if (mode !== 'year' || years.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          )

        const top = visible[0]
        if (!top?.target.id.startsWith('gallery-year-')) return
        setActiveYear(top.target.id.replace('gallery-year-', ''))
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.15, 0.4],
      },
    )

    for (const year of years) {
      const el = sectionRefs.current.get(year)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [mode, years])

  useEffect(() => {
    if (deepLinkedYear.current) return
    if (mode !== 'year' || !yearParam || !years.includes(yearParam)) return

    deepLinkedYear.current = true
    const frame = requestAnimationFrame(() => {
      sectionRefs.current
        .get(yearParam)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => cancelAnimationFrame(frame)
  }, [mode, yearParam, years])

  function browseByYear() {
    setSearchParams({}, { replace: true })
    setDirectoryOpen(false)
  }

  function browseByArtist() {
    setDirectoryOpen(true)
  }

  function selectArtist(slug: string) {
    setSearchParams({ artist: slug }, { replace: true })
    setDirectoryOpen(false)
  }

  function selectYear(year: string) {
    deepLinkedYear.current = true
    setActiveYear(year)
    setSearchParams({ year }, { replace: true })
    sectionRefs.current
      .get(year)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const highlightedYear = activeYear ?? yearParam ?? years[0] ?? null

  return (
    <main className="page gallery-page">
      <Reveal variant="zoom" delay={100}>
      <header className="page-masthead">
        <h1 className="page-title">Media Gallery</h1>
        <p className="page-lede">Browse by year or by artist.</p>
      </header>
      </Reveal>
      <Reveal variant="fade" delay={200}>
      <div className="gallery-mode" role="group" aria-label="Browse gallery by">
        <button
          type="button"
          className={
            mode === 'year' && !directoryOpen
              ? 'gallery-mode__btn is-active'
              : 'gallery-mode__btn'
          }
          aria-pressed={mode === 'year' && !directoryOpen}
          onClick={browseByYear}
        >
          By year
        </button>
        <button
          type="button"
          className={
            mode === 'artist' || directoryOpen
              ? 'gallery-mode__btn is-active'
              : 'gallery-mode__btn'
          }
          aria-pressed={mode === 'artist' || directoryOpen}
          onClick={browseByArtist}
        >
          By artist
        </button>
      </div>
      </Reveal>
      {mode === 'year' ? (
        <Reveal variant="up" delay={300}>
        <div className="gallery-layout gallery-layout--year">
          {years.length > 0 ? (
            <nav
              className="gallery-timeline"
              aria-label="Years"
              style={
                { '--year-count': years.length } as CSSProperties
              }
            >
              <ol className="gallery-timeline__list">
                {years.map((year) => (
                  <li key={year} className="gallery-timeline__item">
                    <button
                      type="button"
                      className={
                        year === highlightedYear
                          ? 'gallery-timeline__year is-active'
                          : 'gallery-timeline__year'
                      }
                      aria-current={
                        year === highlightedYear ? 'true' : undefined
                      }
                      onClick={() => selectYear(year)}
                    >
                      <span className="gallery-timeline__marker" aria-hidden />
                      <span className="gallery-timeline__label">{year}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="gallery-main">
            {gallery.photos.length === 0 ? (
              <p className="gallery-empty">
                Photos will appear here once they are added to the gallery.
              </p>
            ) : (
              years.map((year) => {
                const albumPhotos = toAlbumPhotos(
                  yearPhotoMap.get(year) ?? [],
                  publicUrl,
                )

                return (
                  <section
                    key={year}
                    id={yearSectionId(year)}
                    className="gallery-year-section"
                    ref={(node) => {
                      if (node) sectionRefs.current.set(year, node)
                      else sectionRefs.current.delete(year)
                    }}
                  >
                    <h2 className="gallery-year-section__title">{year}</h2>
                    {albumPhotos.length === 0 ? (
                      <p className="gallery-empty">No photos for this year yet.</p>
                    ) : (
                      <RowsPhotoAlbum
                        photos={albumPhotos}
                        targetRowHeight={180}
                        spacing={8}
                        rowConstraints={{ singleRowMaxHeight: 260 }}
                        defaultContainerWidth={720}
                        sizes={{
                          size: '720px',
                          sizes: [
                            {
                              viewport: '(max-width: 768px)',
                              size: 'calc(100vw - 7rem)',
                            },
                          ],
                        }}
                      />
                    )}
                  </section>
                )
              })
            )}
          </div>
        </div>
        </Reveal>
      ) : (
        <div className="gallery-layout">
          {selectedArtist ? (
            <div className="gallery-artist-bar">
              <p className="gallery-artist-bar__label">
                Viewing <strong>{selectedArtist.name}</strong>
              </p>
              <button
                type="button"
                className="gallery-artist-bar__change"
                onClick={browseByArtist}
              >
                Change artist
              </button>
            </div>
          ) : null}

          <section className="gallery-results" aria-live="polite">
            {!selectedArtist ? (
              <p className="gallery-empty">
                Choose an artist to see their photos.
              </p>
            ) : artistPhotos.length === 0 ? (
              <p className="gallery-empty">No photos for this artist yet.</p>
            ) : (
              <RowsPhotoAlbum
                photos={artistPhotos}
                targetRowHeight={200}
                spacing={8}
                rowConstraints={{ singleRowMaxHeight: 280 }}
                defaultContainerWidth={900}
                sizes={{
                  size: '900px',
                  sizes: [
                    {
                      viewport: '(max-width: 960px)',
                      size: 'calc(100vw - 2.5rem)',
                    },
                  ],
                }}
              />
            )}
          </section>
        </div>
      )}

      <ArtistDirectory
        open={directoryOpen}
        artists={gallery.artists}
        selectedSlug={selectedArtist?.slug ?? null}
        onSelect={selectArtist}
        onClose={() => setDirectoryOpen(false)}
      />
    </main>
  )
}
