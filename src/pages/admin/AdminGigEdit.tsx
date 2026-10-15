import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GigImageField, {
  type PendingGigImage,
} from '../../components/GigImageField'
import MarkdownEditor from '../../components/MarkdownEditor'
import {
  adminCreateGig,
  adminGetGig,
  adminUpdateGig,
  adminUploadGigImage,
} from '../../gigs/api'
import type { GigInput } from '../../gigs/types'
import { isPastGigDate } from '../../gigs/types'

const SAVED_FLASH_MS = 2000

const emptyForm = {
  date: '',
  name: '',
  description: '',
  tickets: '',
  ticketsAvailable: true,
  website: '',
  imagepath: '',
  bodyMarkdown: '',
  venue: '',
  doors: '',
  music: '',
  priceStandard: '',
  priceUnwaged: '',
  priceMembers: '',
}

export default function AdminGigEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const savedTimerRef = useRef<number | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(isNew ? 'new' : null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pendingImage, setPendingImage] = useState<PendingGigImage | null>(null)
  const [imageBusy, setImageBusy] = useState(false)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  function flashSaved() {
    setSaved(true)
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
    }
    savedTimerRef.current = window.setTimeout(() => {
      setSaved(false)
      savedTimerRef.current = null
    }, SAVED_FLASH_MS)
  }

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    adminGetGig(id)
      .then((gig) => {
        if (cancelled) return
        setForm({
          date: gig.date,
          name: gig.name,
          description: gig.description,
          tickets: gig.tickets,
          ticketsAvailable: gig.ticketsAvailable !== false,
          website: gig.website,
          imagepath: gig.imagepath,
          bodyMarkdown: gig.bodyMarkdown,
          venue: gig.venue,
          doors: gig.doors,
          music: gig.music,
          priceStandard: gig.ticketPrices.standard ?? '',
          priceUnwaged: gig.ticketPrices.unwaged ?? '',
          priceMembers: gig.ticketPrices.members ?? '',
        })
        setLoadError(null)
        setLoadedId(gig.id)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load gig')
          setLoadedId(id)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  function patchForm(patch: Partial<typeof emptyForm>) {
    setSaved(false)
    setForm((current) => ({ ...current, ...patch }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      let imagepath = form.imagepath
      if (pendingImage) {
        const uploaded = await adminUploadGigImage({
          blob: pendingImage.blob,
          filename: pendingImage.filename,
          contentType: pendingImage.contentType,
        })
        imagepath = uploaded.imagepath
      }

      const input: GigInput = {
        date: form.date,
        name: form.name,
        description: form.description,
        tickets: form.tickets,
        ticketsAvailable: form.ticketsAvailable,
        website: form.website,
        imagepath,
        bodyMarkdown: form.bodyMarkdown,
        venue: form.venue,
        doors: form.doors,
        music: form.music,
        ticketPrices: {
          standard: form.priceStandard,
          unwaged: form.priceUnwaged,
          members: form.priceMembers,
        },
      }

      if (isNew) {
        const gig = await adminCreateGig(input)
        navigate(`/admin/gigs/${gig.id}`, { replace: true })
      } else {
        await adminUpdateGig(id, input)
        setForm((current) => ({ ...current, imagepath }))
        setPendingImage(null)
        flashSaved()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const loading = !isNew && loadedId !== id

  if (loading) {
    return (
      <main className="page admin-page">
        <p className="admin-loading">Loading gig…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="page admin-page">
        <header className="admin-page-header">
          <div>
            <h1 className="page-title">Gig not found</h1>
            <p className="page-lede">{loadError}</p>
          </div>
        </header>
        <p className="page-lede">
          <Link to="/admin/gigs" className="admin-back-link">
            ← All gigs
          </Link>
        </p>
      </main>
    )
  }

  const past = form.date ? isPastGigDate(form.date) : false

  return (
    <main className="page admin-page admin-edit-page">
      <header className="admin-page-header">
        <div>
          <Link to="/admin/gigs" className="admin-back-link">
            ← All gigs
          </Link>
          <h1 className="page-title">{isNew ? 'New gig' : 'Edit gig'}</h1>
          <p className="page-lede">
            {isNew
              ? 'Add an upcoming gig to the homepage list.'
              : 'Update gig details, image, and optional more-info content.'}
          </p>
        </div>
      </header>

      {past ? (
        <p className="admin-gig-past-banner" role="status">
          This gig date has passed. Delete it from the gig list when you no longer
          need it.
        </p>
      ) : null}

      <form className="site-form site-form--wide admin-edit-form" onSubmit={onSubmit}>
        <div className="admin-edit-grid">
          <label className="form-field">
            <span>Date</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={(e) => patchForm({ date: e.target.value })}
              required
            />
          </label>

          <label className="form-field">
            <span>Artist / event name</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              required
            />
          </label>
        </div>

        <label className="form-field">
          <span>Short description (homepage)</span>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={(e) => patchForm({ description: e.target.value })}
            required
          />
        </label>

        <GigImageField
          currentImagepath={form.imagepath}
          pending={pendingImage}
          onPendingChange={(next) => {
            setSaved(false)
            setPendingImage(next)
          }}
          onClearCurrent={() => patchForm({ imagepath: '' })}
          onBusyChange={setImageBusy}
        />

        <label className="form-field consent-field admin-toggle">
          <input
            type="checkbox"
            name="ticketsAvailable"
            checked={form.ticketsAvailable}
            onChange={(e) => patchForm({ ticketsAvailable: e.target.checked })}
          />
          <span>Tickets available</span>
        </label>

        <div className="admin-edit-grid">
          <label className="form-field">
            <span>Tickets URL</span>
            <input
              type="url"
              name="tickets"
              value={form.tickets}
              onChange={(e) => patchForm({ tickets: e.target.value })}
              placeholder="https://tickets-scotland.com/…"
              disabled={!form.ticketsAvailable}
            />
          </label>

          <label className="form-field">
            <span>Artist website</span>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={(e) => patchForm({ website: e.target.value })}
              placeholder="https://…"
            />
          </label>
        </div>

        <fieldset className="admin-gig-defaults">
          <legend>Optional overrides (leave blank for club defaults)</legend>
          <div className="admin-edit-grid admin-edit-grid--3">
            <label className="form-field">
              <span>Venue</span>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => patchForm({ venue: e.target.value })}
                placeholder="14 Royal Terrace, EH7 5AB"
              />
            </label>
            <label className="form-field">
              <span>Doors</span>
              <input
                type="text"
                value={form.doors}
                onChange={(e) => patchForm({ doors: e.target.value })}
                placeholder="7:30pm"
              />
            </label>
            <label className="form-field">
              <span>Music</span>
              <input
                type="text"
                value={form.music}
                onChange={(e) => patchForm({ music: e.target.value })}
                placeholder="8:00pm"
              />
            </label>
          </div>
          <div className="admin-edit-grid admin-edit-grid--3">
            <label className="form-field">
              <span>Standard price</span>
              <input
                type="text"
                value={form.priceStandard}
                onChange={(e) => patchForm({ priceStandard: e.target.value })}
                placeholder="£15*"
              />
            </label>
            <label className="form-field">
              <span>Unwaged price</span>
              <input
                type="text"
                value={form.priceUnwaged}
                onChange={(e) => patchForm({ priceUnwaged: e.target.value })}
                placeholder="£12*"
              />
            </label>
            <label className="form-field">
              <span>Members price</span>
              <input
                type="text"
                value={form.priceMembers}
                onChange={(e) => patchForm({ priceMembers: e.target.value })}
                placeholder="£10"
              />
            </label>
          </div>
        </fieldset>

        <div className="form-field">
          <span className="gig-image-label">More details (for popup)</span>
          <MarkdownEditor
            value={form.bodyMarkdown}
            onChange={(value) => patchForm({ bodyMarkdown: value })}
          />
        </div>

        {error ? (
          <p className="news-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="admin-form-actions">
          <button
            type="submit"
            className={`form-submit${saved ? ' form-submit--saved' : ''}`}
            disabled={saving || imageBusy || saved}
            aria-live="polite"
          >
            {saved
              ? 'Details saved'
              : saving
                ? pendingImage
                  ? 'Uploading image & saving…'
                  : 'Saving…'
                : imageBusy
                  ? 'Waiting for image…'
                  : isNew
                    ? 'Create gig'
                    : 'Save changes'}
          </button>
        </div>
      </form>
    </main>
  )
}
