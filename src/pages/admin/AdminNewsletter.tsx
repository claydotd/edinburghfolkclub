import {
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { adminListGigs } from '../../gigs/api'
import { formatGigDate, isPastGigDate, type Gig } from '../../gigs/types'
import { adminListPosts, formatNewsDate, isNewsDemo } from '../../news/api'
import type { NewsPost } from '../../news/types'
import {
  adminAddSubscriber,
  adminDeleteSubscriber,
  adminImportSubscribers,
  adminListSubscribers,
  adminNewsletterStatus,
  adminPreviewNewsletter,
  adminSendNewsletter,
  adminSendNewsletterTest,
  adminUnsubscribeSubscriber,
} from '../../newsletter/api'
import { extractEmailsFromCsv } from '../../newsletter/csvImport'
import {
  formatSubscriberDate,
  type NewsletterNewsItemInput,
  type NewsletterPreview,
  type NewsletterStatus,
  type NewsletterSubscriber,
} from '../../newsletter/types'

type DraftNewsItem = {
  key: string
  source: 'custom' | 'post'
  title: string
  body: string
  linkUrl: string
  linkLabel: string
  postId: string
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

function newsletterTab(pathname: string): 'compose' | 'subscribers' {
  return pathname.includes('/newsletter/subscribers') ? 'subscribers' : 'compose'
}

function newDraftItem(source: DraftNewsItem['source'] = 'custom'): DraftNewsItem {
  return {
    key: crypto.randomUUID(),
    source,
    title: '',
    body: '',
    linkUrl: '',
    linkLabel: '',
    postId: '',
  }
}

function toNewsItemInput(item: DraftNewsItem): NewsletterNewsItemInput {
  if (item.source === 'post') {
    return { source: 'post', postId: item.postId }
  }
  return {
    source: 'custom',
    title: item.title,
    body: item.body,
    linkUrl: item.linkUrl.trim() || undefined,
    linkLabel: item.linkLabel.trim() || undefined,
  }
}

function NewsPostPicker({
  posts,
  value,
  onChange,
  excludeIds,
}: {
  posts: NewsPost[]
  value: string
  onChange: (postId: string) => void
  excludeIds: string[]
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = posts.find((post) => post.id === value) ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    const available = posts.filter(
      (post) => post.id === value || !excludeIds.includes(post.id),
    )
    const needle = query.trim().toLowerCase()
    if (!needle) return available
    return available.filter(
      (post) =>
        post.title.toLowerCase().includes(needle) ||
        post.slug.toLowerCase().includes(needle) ||
        post.excerpt.toLowerCase().includes(needle),
    )
  }, [excludeIds, posts, query, value])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  if (selected && !open) {
    return (
      <div className="admin-newsletter-post-picked">
        <div>
          <p className="admin-newsletter-post-picked-title">{selected.title}</p>
          {selected.publishedAt ? (
            <p className="admin-newsletter-post-picked-meta">
              {formatNewsDate(selected.publishedAt)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="admin-action-btn"
          onClick={() => {
            onChange('')
            setQuery('')
            setOpen(true)
          }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="admin-newsletter-post-picker" ref={rootRef}>
      <label className="form-field">
        <span>Search news posts</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Type to search…"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          role="combobox"
        />
      </label>
      {open ? (
        <ul
          id={listId}
          className="admin-newsletter-post-options"
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="admin-newsletter-post-empty">No matching posts</li>
          ) : (
            options.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={post.id === value}
                  className={
                    post.id === value
                      ? 'admin-newsletter-post-option is-selected'
                      : 'admin-newsletter-post-option'
                  }
                  onClick={() => {
                    onChange(post.id)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <span className="admin-newsletter-post-option-title">
                    {post.title}
                  </span>
                  {post.publishedAt ? (
                    <span className="admin-newsletter-post-option-meta">
                      {formatNewsDate(post.publishedAt)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default function AdminNewsletter() {
  const { pathname } = useLocation()
  const tab = newsletterTab(pathname)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [testTo, setTestTo] = useState('')
  const [sendKey, setSendKey] = useState('')
  const [newsItems, setNewsItems] = useState<DraftNewsItem[]>([])
  const [selectedGigs, setSelectedGigs] = useState<string[]>([])
  const [posts, setPosts] = useState<NewsPost[] | null>(null)
  const [gigs, setGigs] = useState<Gig[] | null>(null)
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[] | null>(
    null,
  )
  const [status, setStatus] = useState<NewsletterStatus | null>(null)
  const [preview, setPreview] = useState<NewsletterPreview | null>(null)
  const [previewFrameUrl, setPreviewFrameUrl] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  // Blob URLs inherit this page's origin so Adobe Fonts/Typekit can load in the
  // preview iframe (srcDoc is an opaque origin and often blocks the kit).
  useEffect(() => {
    if (!preview?.html) {
      setPreviewFrameUrl(null)
      return
    }
    const url = URL.createObjectURL(
      new Blob([preview.html], { type: 'text/html;charset=utf-8' }),
    )
    setPreviewFrameUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview])

  const publishedPosts = useMemo(
    () => (posts ?? []).filter((post) => post.published),
    [posts],
  )
  const upcomingGigs = useMemo(
    () =>
      (gigs ?? [])
        .filter((gig) => !isPastGigDate(gig.date))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [gigs],
  )
  const activeCount =
    status?.active ??
    (subscribers ?? []).filter((subscriber) => !subscriber.unsubscribedAt)
      .length

  useEffect(() => {
    if (isNewsDemo()) return
    let cancelled = false
    Promise.all([
      adminListPosts(),
      adminListGigs(),
      adminListSubscribers(),
      adminNewsletterStatus(),
    ])
      .then(([postList, gigList, subscriberList, newsletterStatus]) => {
        if (cancelled) return
        setPosts(postList)
        setGigs(gigList)
        setSubscribers(subscriberList)
        setStatus(newsletterStatus)
        setError(null)
        setSelectedGigs((current) => {
          if (current.length) return current
          return gigList
            .filter((gig) => !isPastGigDate(gig.date))
            .map((gig) => gig.id)
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Failed to load newsletter data',
        )
        setPosts([])
        setGigs([])
        setSubscribers([])
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  useEffect(() => {
    setError(null)
    setNotice(null)
  }, [tab])

  function updateNewsItem(key: string, patch: Partial<DraftNewsItem>) {
    setNewsItems((items) =>
      items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  function composePayload() {
    return {
      subject: subject.trim(),
      message: message.trim(),
      newsItems: newsItems.map(toNewsItemInput),
      gigIds: selectedGigs,
      testTo: testTo.trim() || undefined,
      sendKey: sendKey || undefined,
    }
  }

  async function onPreview() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const next = await adminPreviewNewsletter(composePayload())
      setPreview(next)
      setNotice('Preview updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSendTest(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await adminSendNewsletterTest(composePayload())
      setNotice(`Test email sent to ${result.to}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test send failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSendAll() {
    if (
      !window.confirm(
        `Send this newsletter to ${activeCount} active subscriber${activeCount === 1 ? '' : 's'}?`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await adminSendNewsletter(composePayload())
      const failedNote =
        result.failed > 0
          ? ` ${result.failed} failed${result.errors.length ? `: ${result.errors.join('; ')}` : '.'}`
          : ''
      setNotice(
        `Sent to ${result.sent} subscriber${result.sent === 1 ? '' : 's'}.${failedNote}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  async function onAddSubscriber(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await adminAddSubscriber(newEmail)
      setNewEmail('')
      setReloadToken((n) => n + 1)
      setNotice('Subscriber added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add subscriber')
    } finally {
      setBusy(false)
    }
  }

  async function onImportCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = csvInputRef.current
    const file = input?.files?.[0]
    if (!file) {
      setError('Choose a CSV file to import.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const text = await file.text()
      const { emails, rowCount } = extractEmailsFromCsv(text)
      if (!emails.length) {
        throw new Error(
          rowCount
            ? 'No valid email addresses found in that CSV.'
            : 'That CSV looks empty.',
        )
      }
      if (
        !window.confirm(
          `Import ${emails.length} email${emails.length === 1 ? '' : 's'} from ${file.name}? Existing active subscribers will be skipped; unsubscribed addresses will be reactivated.`,
        )
      ) {
        return
      }
      const result = await adminImportSubscribers(emails)
      setReloadToken((n) => n + 1)
      setCsvFileName(null)
      if (input) input.value = ''
      const parts = [
        `${result.added} added`,
        result.reactivated ? `${result.reactivated} reactivated` : null,
        result.skipped ? `${result.skipped} already subscribed` : null,
        result.invalid ? `${result.invalid} invalid` : null,
      ].filter(Boolean)
      setNotice(`Import complete: ${parts.join(', ')}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV import failed')
    } finally {
      setBusy(false)
    }
  }

  async function onUnsubscribe(subscriber: NewsletterSubscriber) {
    if (!window.confirm(`Unsubscribe ${subscriber.email}?`)) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await adminUnsubscribeSubscriber(subscriber.id)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unsubscribe failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(subscriber: NewsletterSubscriber) {
    if (!window.confirm(`Permanently delete ${subscriber.email}?`)) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await adminDeleteSubscriber(subscriber.id)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  if (isNewsDemo()) {
    return (
      <main className="page admin-page">
        <header className="admin-page-header">
          <div>
            <h1 className="page-title">Newsletter</h1>
            <p className="page-lede">
              Newsletter sending needs the live Netlify site. This preview does
              not keep a shared mailing list.
            </p>
          </div>
        </header>
      </main>
    )
  }

  return (
    <main className="page admin-page admin-edit-page admin-newsletter-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Newsletter</h1>
          <p className="page-lede">
            {tab === 'compose'
              ? `Password is required to send emails.`
              : `Manage the mailing list. ${activeCount} active subscriber${activeCount === 1 ? '' : 's'}.`}
          </p>
        </div>
      </header>

      <nav className="admin-newsletter-tabs" aria-label="Newsletter sections">
        <NavLink to="/admin/newsletter" end>
          Composer
        </NavLink>
        <NavLink to="/admin/newsletter/subscribers">Subscribers</NavLink>
      </nav>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="form-success" role="status">
          {notice}
        </p>
      ) : null}

      {tab === 'compose' ? (
        <section
          className="admin-newsletter-compose"
          aria-labelledby="compose-heading"
        >
          <h2 id="compose-heading" className="visually-hidden">
            Composer
          </h2>
          <form
            className="site-form site-form--wide admin-edit-form"
            onSubmit={onSendTest}
          >
            <label className="form-field">
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
                maxLength={200}
              />
            </label>
            <label className="form-field">
              <span>Written message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                required
                placeholder="Hello folks, here’s what’s coming up at the club…"
              />
            </label>

            <section className="admin-newsletter-section">
              <div className="admin-newsletter-block-header">
                <h3 className="admin-newsletter-block-title">
                  Other news items
                </h3>
                <p className="admin-newsletter-block-lede">
                  Add custom notes or pull in published posts.
                </p>
              </div>

              {newsItems.length === 0 ? (
                <p className="admin-newsletter-empty">
                  No news items yet.
                </p>
              ) : (
                <div className="admin-newsletter-item-list">
                  {newsItems.map((item, index) => {
                    const usedPostIds = newsItems
                      .filter(
                        (other) =>
                          other.key !== item.key &&
                          other.source === 'post' &&
                          other.postId,
                      )
                      .map((other) => other.postId)
                    return (
                      <fieldset
                        key={item.key}
                        className="admin-newsletter-item"
                      >
                        <legend className="admin-newsletter-item-legend">
                          Item {index + 1}
                        </legend>

                        <div className="admin-newsletter-item-toolbar">
                          <div
                            className="admin-newsletter-source-toggle"
                            role="radiogroup"
                            aria-label={`News item ${index + 1} source`}
                          >
                            <label
                              className={
                                item.source === 'custom'
                                  ? 'admin-newsletter-source-option is-selected'
                                  : 'admin-newsletter-source-option'
                              }
                            >
                              <input
                                type="radio"
                                name={`news-source-${item.key}`}
                                checked={item.source === 'custom'}
                                onChange={() =>
                                  updateNewsItem(item.key, {
                                    source: 'custom',
                                    postId: '',
                                  })
                                }
                              />
                              <span>Write custom</span>
                            </label>
                            <label
                              className={
                                item.source === 'post'
                                  ? 'admin-newsletter-source-option is-selected'
                                  : 'admin-newsletter-source-option'
                              }
                            >
                              <input
                                type="radio"
                                name={`news-source-${item.key}`}
                                checked={item.source === 'post'}
                                onChange={() =>
                                  updateNewsItem(item.key, { source: 'post' })
                                }
                              />
                              <span>Existing post</span>
                            </label>
                          </div>
                          <button
                            type="button"
                            className="admin-banner-remove"
                            onClick={() =>
                              setNewsItems((items) =>
                                items.filter((entry) => entry.key !== item.key),
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>

                        {item.source === 'custom' ? (
                          <div className="admin-newsletter-item-fields">
                            <label className="form-field">
                              <span>Heading</span>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(event) =>
                                  updateNewsItem(item.key, {
                                    title: event.target.value,
                                  })
                                }
                                required
                              />
                            </label>
                            <label className="form-field">
                              <span>Body text</span>
                              <textarea
                                value={item.body}
                                onChange={(event) =>
                                  updateNewsItem(item.key, {
                                    body: event.target.value,
                                  })
                                }
                                rows={4}
                                required
                              />
                            </label>
                            <div className="admin-edit-grid admin-newsletter-link-grid">
                              <label className="form-field">
                                <span>Link URL (optional)</span>
                                <input
                                  type="text"
                                  value={item.linkUrl}
                                  onChange={(event) =>
                                    updateNewsItem(item.key, {
                                      linkUrl: event.target.value,
                                    })
                                  }
                                  placeholder="/news/… or https://…"
                                />
                              </label>
                              <label className="form-field">
                                <span>Button label</span>
                                <input
                                  type="text"
                                  value={item.linkLabel}
                                  onChange={(event) =>
                                    updateNewsItem(item.key, {
                                      linkLabel: event.target.value,
                                    })
                                  }
                                  placeholder="Find out more"
                                  disabled={!item.linkUrl.trim()}
                                />
                              </label>
                            </div>
                          </div>
                        ) : posts === null ? (
                          <p className="admin-loading">Loading posts…</p>
                        ) : publishedPosts.length === 0 ? (
                          <p className="page-lede">
                            No published news posts yet.
                          </p>
                        ) : (
                          <NewsPostPicker
                            posts={publishedPosts}
                            value={item.postId}
                            excludeIds={usedPostIds}
                            onChange={(postId) =>
                              updateNewsItem(item.key, { postId })
                            }
                          />
                        )}
                      </fieldset>
                    )
                  })}
                </div>
              )}

              <div className="admin-banner-add-row">
                <button
                  type="button"
                  className="admin-banner-add"
                  onClick={() =>
                    setNewsItems((items) => [...items, newDraftItem('custom')])
                  }
                >
                  Add news item
                </button>
              </div>
            </section>

            <section className="admin-newsletter-section">
              <div className="admin-newsletter-block-header">
                <h3 className="admin-newsletter-block-title">Upcoming gigs</h3>
                <p className="admin-newsletter-block-lede">
                  Choose which gigs appear in this email.
                </p>
              </div>
              {gigs === null ? (
                <p className="admin-loading">Loading gigs…</p>
              ) : upcomingGigs.length === 0 ? (
                <p className="admin-newsletter-empty">No upcoming gigs.</p>
              ) : (
                <ul className="admin-newsletter-check-list">
                  {upcomingGigs.map((gig) => (
                    <li key={gig.id}>
                      <label className="admin-newsletter-gig-option">
                        <input
                          type="checkbox"
                          checked={selectedGigs.includes(gig.id)}
                          onChange={() =>
                            setSelectedGigs((ids) => toggleId(ids, gig.id))
                          }
                        />
                        <span className="admin-newsletter-gig-copy">
                          <span className="admin-newsletter-gig-date">
                            {formatGigDate(gig.date)}
                          </span>
                          <span className="admin-newsletter-gig-name">
                            {gig.name}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="admin-form-actions admin-newsletter-actions">
              <button
                type="button"
                className="admin-action-btn admin-newsletter-preview-btn"
                onClick={() => void onPreview()}
                disabled={busy}
              >
                Preview
              </button>
              <div className="form-field admin-newsletter-test">
                <label htmlFor="newsletter-test-to">Send test to</label>
                <input
                  id="newsletter-test-to"
                  type="email"
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-field admin-newsletter-send-key">
                <label htmlFor="newsletter-send-key">Send password</label>
                <input
                  id="newsletter-send-key"
                  type="password"
                  value={sendKey}
                  onChange={(event) => setSendKey(event.target.value)}
                  autoComplete="off"
                  placeholder="password..."
                  required
                />
              </div>
              <button
                type="submit"
                className="form-submit admin-newsletter-send-test"
                disabled={busy}
              >
                {busy ? 'Working…' : 'Send test'}
              </button>
              <button
                type="button"
                className="form-submit admin-newsletter-send-all"
                onClick={() => void onSendAll()}
                disabled={busy || activeCount === 0 || !sendKey}
              >
                Send to list
              </button>
            </div>
          </form>

          {preview && previewFrameUrl ? (
            <div className="admin-newsletter-preview">
              <h3 className="admin-section-title">
                Preview — {preview.subject}
              </h3>
              <iframe
                title="Newsletter preview"
                className="admin-newsletter-preview-frame"
                src={previewFrameUrl}
              />
            </div>
          ) : null}
        </section>
      ) : (
        <section
          className="admin-newsletter-subscribers"
          aria-labelledby="subscribers-heading"
        >
          <h2 id="subscribers-heading" className="visually-hidden">
            Subscribers
          </h2>
          <form
            className="admin-newsletter-add"
            onSubmit={onAddSubscriber}
          >
            <label className="form-field">
              <span>Add email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button type="submit" className="form-submit" disabled={busy}>
              Add
            </button>
          </form>

          <form
            className="admin-newsletter-import"
            onSubmit={(event) => void onImportCsv(event)}
          >
            <label className="form-field">
              <span>Import CSV</span>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setCsvFileName(file?.name ?? null)
                }}
              />
            </label>
            <p className="admin-newsletter-import-hint">
              One email per row, or a column headed <code>email</code>.
              {csvFileName ? ` Selected: ${csvFileName}` : null}
            </p>
            <button
              type="submit"
              className="form-submit"
              disabled={busy || !csvFileName}
            >
              Upload CSV
            </button>
          </form>

          {subscribers === null ? (
            <p className="admin-loading">Loading subscribers…</p>
          ) : subscribers.length === 0 ? (
            <p className="page-lede">No subscribers yet.</p>
          ) : (
            <div className="admin-member-table-wrap">
              <table className="admin-member-table">
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => {
                    const active = !subscriber.unsubscribedAt
                    return (
                      <tr key={subscriber.id}>
                        <td>{subscriber.email}</td>
                        <td>
                          <span
                            className={
                              active
                                ? 'admin-post-status is-published'
                                : 'admin-post-status is-draft'
                            }
                          >
                            {active ? 'Active' : 'Unsubscribed'}
                          </span>
                        </td>
                        <td>{formatSubscriberDate(subscriber.consentedAt)}</td>
                        <td>
                          <div className="admin-post-actions">
                            {active ? (
                              <button
                                type="button"
                                className="admin-action-btn"
                                onClick={() => void onUnsubscribe(subscriber)}
                                disabled={busy}
                              >
                                Unsubscribe
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-action-btn admin-post-delete"
                              onClick={() => void onDelete(subscriber)}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
