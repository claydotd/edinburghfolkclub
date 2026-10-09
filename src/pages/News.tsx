import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNewsSnapshot, formatNewsDate } from '../news/api'
import type { NewsSnapshotPost } from '../news/types'
import Reveal from '../components/Reveal'

const FOLK_NEWS_SOURCES = [
  { name: 'TRACS', url: 'https://tracscotland.org' },
  { name: 'TMFS', url: 'https://traditionalmusicforum.org' },
  {
    name: 'Scottish International Storytelling Festival',
    url: 'https://sisf.org.uk',
  },
  {
    name: 'Leith Folk Club',
    url: 'https://www.facebook.com/p/Leith-Folk-Club-100091521022711/',
  },
  {
    name: 'Scottish Storytelling Centre',
    url: 'https://scottishstorytellingcentre.com',
  },
] as const

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const PAGE_SIZE = 3

function postDateParts(post: NewsSnapshotPost): { year: number; month: number } | null {
  if (!post.publishedAt) return null
  const date = new Date(post.publishedAt)
  if (Number.isNaN(date.getTime())) return null
  return { year: date.getFullYear(), month: date.getMonth() }
}

function matchesQuery(post: NewsSnapshotPost, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return [post.title, post.excerpt, post.bodyMarkdown].some((field) =>
    field.toLowerCase().includes(trimmed),
  )
}

function formatResultStatus(
  count: number,
  year: number | null,
  month: number | null,
  query: string,
): string {
  const searching = query.trim() !== ''
  if (searching) {
    return count === 1 ? '1 result' : `${count} results`
  }
  if (year != null && month != null) {
    const label = `${MONTH_LABELS[month]} ${year}`
    return count === 1 ? `1 article in ${label}` : `${count} articles in ${label}`
  }
  if (year != null) {
    return count === 1 ? `1 article in ${year}` : `${count} articles in ${year}`
  }
  return count === 1 ? '1 article' : `${count} articles`
}

export default function News() {
  const filtersId = useId()
  const [posts, setPosts] = useState<NewsSnapshotPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    fetchNewsSnapshot()
      .then((snapshot) => {
        if (!cancelled) setPosts(snapshot.posts)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load news')
          setPosts([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const yearCounts = new Map<number, number>()
  if (posts) {
    for (const post of posts) {
      const parts = postDateParts(post)
      if (!parts) continue
      yearCounts.set(parts.year, (yearCounts.get(parts.year) ?? 0) + 1)
    }
  }

  const years = [...yearCounts.keys()].sort((a, b) => b - a)

  const months = posts
    ? [
        ...new Set(
          posts
            .map(postDateParts)
            .filter((value): value is { year: number; month: number } => {
              if (value == null) return false
              if (year != null && value.year !== year) return false
              return true
            })
            .map((parts) => parts.month),
        ),
      ].sort((a, b) => a - b)
    : []

  const filtered =
    posts?.filter((post) => {
      const parts = postDateParts(post)
      if (year != null && parts?.year !== year) return false
      if (month != null && parts?.month !== month) return false
      return matchesQuery(post, query)
    }) ?? null

  const visiblePosts = filtered?.slice(0, visibleCount) ?? null
  const remainingCount =
    filtered != null ? Math.max(0, filtered.length - visibleCount) : 0

  const hasActiveFilters = query.trim() !== '' || year != null || month != null
  const hasSearchOrMonth = query.trim() !== '' || month != null

  function resetVisible() {
    setVisibleCount(PAGE_SIZE)
  }

  function clearFilters() {
    setQuery('')
    setYear(null)
    setMonth(null)
    resetVisible()
  }

  function selectYear(next: number | null) {
    setYear(next)
    setMonth(null)
    resetVisible()
  }

  function selectMonth(next: number | null) {
    setMonth(next)
    resetVisible()
  }

  function setSearchQuery(next: string) {
    setQuery(next)
    resetVisible()
  }

  function returnToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const allLoaded =
    filtered != null && filtered.length > 0 && remainingCount === 0
  const showListAction =
    filtered != null && filtered.length > PAGE_SIZE

  return (
    <main className="page news-page">
      <Reveal variant="zoom" delay={100}>
        <header className="page-masthead">
          <h1 className="page-title">News</h1>
          <p className="page-lede">Check here for our latest news and updates.</p>
        </header>
      </Reveal>

      <div className="news-layout">
        <div className="news-main">
          {posts === null ? (
            <p className="page-lede">Loading…</p>
          ) : error ? (
            <p className="news-error" role="alert">
              {error}
            </p>
          ) : posts.length === 0 ? (
            <p className="page-lede">No news yet.</p>
          ) : (
            <>
              <div className="news-toolbar">
                <button
                  type="button"
                  className={`news-filters-toggle${filtersOpen ? ' is-open' : ''}${hasSearchOrMonth ? ' has-active' : ''}`}
                  aria-expanded={filtersOpen}
                  aria-controls={filtersId}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  {filtersOpen ? 'Hide search' : 'Search news...'}
                  {hasSearchOrMonth && !filtersOpen ? (
                    <span className="news-filters-toggle-badge">Active</span>
                  ) : null}
                </button>
              </div>

              <div
                className={`news-controls-panel${filtersOpen ? ' is-open' : ''}`}
                id={filtersId}
                aria-hidden={!filtersOpen}
              >
                <div className="news-controls-panel-inner">
                  <div className="news-controls" inert={filtersOpen ? undefined : true}>
                    <label className="news-search">
                      <span className="visually-hidden">Search news</span>
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search news…"
                        autoComplete="off"
                      />
                    </label>

                    {months.length > 0 ? (
                      <div
                        className="news-filter-chips"
                        role="group"
                        aria-label="Filter by month"
                      >
                        <button
                          type="button"
                          className={`news-filter-chip${month === null ? ' is-active' : ''}`}
                          aria-pressed={month === null}
                          onClick={() => selectMonth(null)}
                        >
                          All months
                        </button>
                        {months.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`news-filter-chip${month === value ? ' is-active' : ''}`}
                            aria-pressed={month === value}
                            onClick={() => selectMonth(value)}
                          >
                            {MONTH_LABELS[value]}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {hasSearchOrMonth ? (
                      <button
                        type="button"
                        className="news-clear-filters"
                        onClick={() => {
                          setQuery('')
                          setMonth(null)
                          resetVisible()
                        }}
                      >
                        Clear search &amp; month
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {filtered && filtered.length === 0 ? (
                <p className="page-lede">
                  No articles match
                  {hasActiveFilters ? ' your search or filter.' : '.'}
                  {hasActiveFilters ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="news-clear-filters"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    </>
                  ) : null}
                </p>
              ) : (
                <>
                  {hasActiveFilters && filtered ? (
                    <p className="news-result-status" aria-live="polite">
                      {formatResultStatus(filtered.length, year, month, query)}
                    </p>
                  ) : null}

                  <ul className="news-list">
                    {visiblePosts?.map((post) => (
                      <Reveal key={post.id} variant="up" delay={100}>
                        <li>
                          <Link to={`/news/${post.slug}`}>
                            <span className="news-list-title">{post.title}</span>
                            {post.publishedAt ? (
                              <time
                                className="news-list-date"
                                dateTime={post.publishedAt}
                              >
                                {formatNewsDate(post.publishedAt)}
                              </time>
                            ) : null}
                            {post.excerpt ? (
                              <span className="news-list-excerpt">
                                {post.excerpt}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      </Reveal>
                    ))}
                  </ul>

                  {showListAction ? (
                    remainingCount > 0 ? (
                      <button
                        type="button"
                        className="news-load-more"
                        onClick={() =>
                          setVisibleCount((count) => count + PAGE_SIZE)
                        }
                      >
                        Load more ({remainingCount})
                      </button>
                    ) : allLoaded ? (
                      <button
                        type="button"
                        className="news-load-more"
                        onClick={returnToTop}
                      >
                        Return to top
                      </button>
                    ) : null
                  ) : null}
                </>
              )}
            </>
          )}
        </div>

        <Reveal variant="left" delay={100}>
          <div className="news-sidebar">
            <aside className="news-sources" aria-label="Other Scottish folk news">
              <h2 className="news-sources-title">Other Folk News</h2>
              <ul className="news-sources-list">
                {FOLK_NEWS_SOURCES.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>

            {posts && years.length > 0 ? (
              <nav className="news-archive" aria-label="News archive by year">
                <h2 className="news-sources-title">Archive</h2>
                <ul className="news-archive-list">
                  <li>
                    <button
                      type="button"
                      className={`news-archive-item${year === null ? ' is-active' : ''}`}
                      aria-current={year === null ? 'true' : undefined}
                      onClick={() => selectYear(null)}
                    >
                      All years
                      <span className="news-archive-count">({posts.length})</span>
                    </button>
                  </li>
                  {years.map((value) => (
                    <li key={value}>
                      <button
                        type="button"
                        className={`news-archive-item${year === value ? ' is-active' : ''}`}
                        aria-current={year === value ? 'true' : undefined}
                        onClick={() => selectYear(value)}
                      >
                        {value}
                        <span className="news-archive-count">
                          ({yearCounts.get(value) ?? 0})
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </Reveal>
      </div>
    </main>
  )
}
