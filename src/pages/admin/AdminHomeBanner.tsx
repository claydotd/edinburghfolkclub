import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminGetHomeBanner, adminUpdateHomeBanner } from '../../news/api'

export default function AdminHomeBanner() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [text, setText] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaHref, setCtaHref] = useState('')

  useEffect(() => {
    let cancelled = false
    adminGetHomeBanner()
      .then((banner) => {
        if (cancelled) return
        setEnabled(banner.enabled)
        setText(banner.text)
        setCtaLabel(banner.ctaLabel)
        setCtaHref(banner.ctaHref)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load banner')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const banner = await adminUpdateHomeBanner({
        enabled,
        text,
        ctaLabel,
        ctaHref,
      })
      setEnabled(banner.enabled)
      setText(banner.text)
      setCtaLabel(banner.ctaLabel)
      setCtaHref(banner.ctaHref)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="page admin-page">
        <p className="admin-loading">Loading banner…</p>
      </main>
    )
  }

  return (
    <main className="page admin-page admin-edit-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Homepage banner</h1>
          <p className="page-lede">
            Shown below the navigation on the homepage when enabled.{' '}
            <Link to="/" target="_blank" rel="noreferrer" className="admin-inline-link">
              Preview homepage
            </Link>
          </p>
        </div>
      </header>

      <form className="site-form site-form--wide admin-edit-form" onSubmit={onSubmit}>
        <label className="form-field consent-field admin-toggle">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Show banner on homepage</span>
        </label>

        <label className="form-field">
          <span>Banner text</span>
          <textarea
            name="text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Membership renewals are open for 2026"
            required={enabled}
          />
        </label>

        <div className="admin-edit-grid">
          <label className="form-field">
            <span>CTA button label</span>
            <input
              type="text"
              name="ctaLabel"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="e.g. Read more"
              required={enabled}
            />
          </label>

          <label className="form-field">
            <span>CTA link</span>
            <input
              type="text"
              name="ctaHref"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
              placeholder="/news or https://…"
              required={enabled}
            />
          </label>
        </div>

        {error ? (
          <p className="news-error" role="alert">
            {error}
          </p>
        ) : null}

        {saved && !error ? (
          <p className="admin-banner-saved" role="status">
            Banner saved.
          </p>
        ) : null}

        <div className="admin-form-actions">
          <button type="submit" className="form-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save banner'}
          </button>
        </div>
      </form>
    </main>
  )
}
