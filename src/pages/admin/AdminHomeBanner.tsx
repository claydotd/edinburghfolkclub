import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminGetHomeBanners, adminUpdateHomeBanners } from '../../news/api'
import {
  BANNER_COLORS,
  type BannerColor,
  type HomeBanner,
  type HomeBannerInput,
} from '../../news/types'

type DraftBanner = {
  key: string
  id?: string
  enabled: boolean
  text: string
  ctaLabel: string
  ctaHref: string
  color: BannerColor
}

const COLOR_LABELS: Record<BannerColor, string> = {
  thistle: 'Thistle',
  moss: 'Moss',
  berry: 'Berry',
  heather: 'Heather',
  ink: 'Ink',
}

function draftFromBanner(banner: HomeBanner): DraftBanner {
  return {
    key: banner.id,
    id: banner.id,
    enabled: banner.enabled,
    text: banner.text,
    ctaLabel: banner.ctaLabel,
    ctaHref: banner.ctaHref,
    color: banner.color,
  }
}

function emptyDraft(color: BannerColor = 'thistle'): DraftBanner {
  return {
    key: crypto.randomUUID(),
    enabled: true,
    text: '',
    ctaLabel: '',
    ctaHref: '',
    color,
  }
}

function nextDefaultColor(existing: DraftBanner[]): BannerColor {
  const used = new Set(existing.map((item) => item.color))
  return BANNER_COLORS.find((color) => !used.has(color)) ?? 'thistle'
}

export default function AdminHomeBanner() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [items, setItems] = useState<DraftBanner[]>([])

  useEffect(() => {
    let cancelled = false
    adminGetHomeBanners()
      .then((banners) => {
        if (cancelled) return
        const drafts = (banners.items ?? []).map(draftFromBanner)
        setItems(drafts.length > 0 ? drafts : [emptyDraft()])
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load banners')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function updateItem(key: string, patch: Partial<DraftBanner>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
    setSaved(false)
  }

  function addBanner() {
    setItems((current) => [...current, emptyDraft(nextDefaultColor(current))])
    setSaved(false)
  }

  function removeBanner(key: string) {
    setItems((current) => {
      const next = current.filter((item) => item.key !== key)
      return next.length > 0 ? next : [emptyDraft()]
    })
    setSaved(false)
  }

  function moveBanner(key: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.key === key)
      if (index < 0) return current
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
    setSaved(false)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload: HomeBannerInput[] = items.map((item) => ({
        id: item.id,
        enabled: item.enabled,
        text: item.text,
        ctaLabel: item.ctaLabel,
        ctaHref: item.ctaHref,
        color: item.color,
      }))
      const banners = await adminUpdateHomeBanners({ items: payload })
      setItems((banners.items ?? []).map(draftFromBanner))
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
        <p className="admin-loading">Loading banners…</p>
      </main>
    )
  }

  return (
    <main className="page admin-page admin-edit-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Homepage banners</h1>
          <p className="page-lede">
            Enabled banners rotate below the navigation on the homepage. Each
            can use a different colour.{' '}
            <Link to="/" target="_blank" rel="noreferrer" className="admin-inline-link">
              Preview homepage
            </Link>
          </p>
        </div>
      </header>

      <form className="site-form site-form--wide admin-edit-form" onSubmit={onSubmit}>
        <div className="admin-banner-list">
          {items.map((item, index) => (
            <fieldset
              key={item.key}
              className={`admin-banner-card admin-banner-card--${item.color}`}
            >
              <legend className="admin-banner-card-legend">
                Banner {index + 1}
              </legend>

              <div className="admin-banner-card-toolbar">
                <label className="form-field consent-field admin-toggle admin-banner-enabled">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      updateItem(item.key, { enabled: e.target.checked })
                    }
                  />
                  <span>Show on homepage</span>
                </label>

                <div className="admin-banner-order">
                  <button
                    type="button"
                    className="admin-banner-order-btn"
                    onClick={() => moveBanner(item.key, -1)}
                    disabled={index === 0}
                    aria-label={`Move banner ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-banner-order-btn"
                    onClick={() => moveBanner(item.key, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move banner ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-banner-remove"
                    onClick={() => removeBanner(item.key)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <label className="form-field">
                <span>Banner text</span>
                <textarea
                  rows={3}
                  value={item.text}
                  onChange={(e) => updateItem(item.key, { text: e.target.value })}
                  placeholder="e.g. Membership renewals are open for 2026"
                  required={item.enabled}
                />
              </label>

              <div className="admin-edit-grid">
                <label className="form-field">
                  <span>CTA button label</span>
                  <input
                    type="text"
                    value={item.ctaLabel}
                    onChange={(e) =>
                      updateItem(item.key, { ctaLabel: e.target.value })
                    }
                    placeholder="e.g. Read more"
                    required={item.enabled}
                  />
                </label>

                <label className="form-field">
                  <span>CTA link</span>
                  <input
                    type="text"
                    value={item.ctaHref}
                    onChange={(e) =>
                      updateItem(item.key, { ctaHref: e.target.value })
                    }
                    placeholder="/news or https://…"
                    required={item.enabled}
                  />
                </label>
              </div>

              <fieldset className="admin-banner-colors">
                <legend>Colour</legend>
                <div className="admin-banner-color-options" role="radiogroup">
                  {BANNER_COLORS.map((color) => (
                    <label
                      key={color}
                      className={`admin-banner-color-option admin-banner-color-option--${color}`}
                    >
                      <input
                        type="radio"
                        name={`color-${item.key}`}
                        value={color}
                        checked={item.color === color}
                        onChange={() => updateItem(item.key, { color })}
                      />
                      <span>{COLOR_LABELS[color]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </fieldset>
          ))}
        </div>

        <div className="admin-banner-add-row">
          <button
            type="button"
            className="admin-banner-add"
            onClick={addBanner}
            disabled={items.length >= 12}
          >
            Add another banner
          </button>
        </div>

        {error ? (
          <p className="news-error" role="alert">
            {error}
          </p>
        ) : null}

        {saved && !error ? (
          <p className="admin-banner-saved" role="status">
            Banners saved.
          </p>
        ) : null}

        <div className="admin-form-actions">
          <button type="submit" className="form-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save banners'}
          </button>
        </div>
      </form>
    </main>
  )
}
