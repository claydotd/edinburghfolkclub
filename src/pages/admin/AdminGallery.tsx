import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  adminCreatePhoto,
  adminDeletePhoto,
  adminListPhotos,
  adminUpdatePhoto,
  adminUploadGalleryImage,
} from '../../gallery/api'
import type { GalleryPhotoArtist, GalleryPhotoRecord } from '../../gallery/types'
import {
  artistNameToSlug,
  formatBytes,
  formatGalleryDate,
  publicGalleryImagePath,
} from '../../gallery/types'
import {
  compressGalleryImage,
  type GalleryCompressedSize,
} from '../../utils/compressImage'
import { clearGalleryCache } from '../../utils/gallery'

type StagingItem = {
  id: string
  fileName: string
  status: 'compressing' | 'ready' | 'error' | 'uploading' | 'done'
  message: string
  year: string
  date: string
  artists: GalleryPhotoArtist[]
  grid?: GalleryCompressedSize
  full?: GalleryCompressedSize
}

type EditDraft = {
  year: string
  date: string
  artists: GalleryPhotoArtist[]
}

function thumbUrl(photo: GalleryPhotoRecord): string {
  if (photo.gridKey.startsWith('data:') || photo.gridKey.startsWith('blob:')) {
    return photo.gridKey
  }
  return publicGalleryImagePath(photo.gridKey)
}

function currentYear(): string {
  return String(new Date().getFullYear())
}

function compareYearsDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true })
}

type LibraryYearGroup = {
  year: string
  count: number
  dateGroups: { key: string; label: string; photos: GalleryPhotoRecord[] }[]
}

function buildLibraryGroups(photos: GalleryPhotoRecord[]): LibraryYearGroup[] {
  const byYear = new Map<string, GalleryPhotoRecord[]>()
  for (const photo of photos) {
    const list = byYear.get(photo.year) ?? []
    list.push(photo)
    byYear.set(photo.year, list)
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => compareYearsDesc(a, b))
    .map(([year, yearPhotos]) => {
      const byDate = new Map<string, GalleryPhotoRecord[]>()
      for (const photo of yearPhotos) {
        const key = photo.date ?? ''
        const list = byDate.get(key) ?? []
        list.push(photo)
        byDate.set(key, list)
      }
      const dateGroups = [...byDate.entries()]
        .sort(([a], [b]) => {
          if (!a) return 1
          if (!b) return -1
          return b.localeCompare(a)
        })
        .map(([key, list]) => ({
          key: key || 'undated',
          label: key ? formatGalleryDate(key) : 'No date',
          photos: list,
        }))
      return { year, count: yearPhotos.length, dateGroups }
    })
}

function ArtistTagsInput({
  artists,
  suggestions,
  onChange,
  id,
}: {
  artists: GalleryPhotoArtist[]
  suggestions: GalleryPhotoArtist[]
  onChange: (artists: GalleryPhotoArtist[]) => void
  id: string
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = draft.trim().toLowerCase()
    const taken = new Set(artists.map((a) => a.slug))
    return suggestions
      .filter((s) => !taken.has(s.slug))
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.slug.includes(q.replace(/\s+/g, '-')),
      )
      .slice(0, 8)
  }, [artists, draft, suggestions])

  function addName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const slug = artistNameToSlug(trimmed)
    if (!slug) return
    if (artists.some((a) => a.slug === slug)) {
      setDraft('')
      return
    }
    onChange([...artists, { slug, name: trimmed }])
    setDraft('')
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      if (filtered[0] && draft.trim()) {
        addName(filtered[0].name)
      } else {
        addName(draft)
      }
    } else if (event.key === 'Backspace' && !draft && artists.length) {
      onChange(artists.slice(0, -1))
    }
  }

  return (
    <div className="admin-artist-tags">
      <div className="admin-artist-tags-list">
        {artists.map((artist) => (
          <button
            key={artist.slug}
            type="button"
            className="admin-artist-tag"
            onClick={() =>
              onChange(artists.filter((item) => item.slug !== artist.slug))
            }
          >
            {artist.name}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        <input
          id={id}
          className="admin-artist-tags-input"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={onKeyDown}
          placeholder={artists.length ? 'Add another…' : 'Type an artist name'}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 ? (
        <ul className="admin-artist-suggest" role="listbox">
          {filtered.map((artist) => (
            <li key={artist.slug}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addName(artist.name)}
              >
                {artist.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function AdminGallery() {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const [photos, setPhotos] = useState<GalleryPhotoRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [staging, setStaging] = useState<StagingItem[]>([])
  const [batchYear, setBatchYear] = useState(currentYear())
  const [batchDate, setBatchDate] = useState('')
  const [batchArtists, setBatchArtists] = useState<GalleryPhotoArtist[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [libraryYear, setLibraryYear] = useState<string | 'all'>('all')
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(
    () => new Set(),
  )
  const didInitCollapse = useRef(false)

  useEffect(() => {
    let cancelled = false
    adminListPhotos()
      .then((list) => {
        if (!cancelled) {
          setPhotos(list)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gallery')
          setPhotos([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const libraryGroups = useMemo(
    () => (photos ? buildLibraryGroups(photos) : []),
    [photos],
  )

  const visibleLibraryGroups = useMemo(() => {
    if (libraryYear === 'all') return libraryGroups
    return libraryGroups.filter((group) => group.year === libraryYear)
  }, [libraryGroups, libraryYear])

  useEffect(() => {
    if (didInitCollapse.current || libraryGroups.length === 0) return
    didInitCollapse.current = true
    // Keep only the newest year expanded so a large library stays scannable.
    const newest = libraryGroups[0]?.year
    const collapsed = new Set(
      libraryGroups
        .map((group) => group.year)
        .filter((year) => year !== newest),
    )
    setCollapsedYears(collapsed)
  }, [libraryGroups])

  useEffect(() => {
    return () => {
      for (const item of staging) {
        if (item.grid?.previewUrl) URL.revokeObjectURL(item.grid.previewUrl)
        if (item.full?.previewUrl) URL.revokeObjectURL(item.full.previewUrl)
      }
    }
    // Only revoke on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const artistSuggestions = useMemo(() => {
    const map = new Map<string, GalleryPhotoArtist>()
    for (const photo of photos ?? []) {
      for (const artist of photo.artists) {
        map.set(artist.slug, artist)
      }
    }
    for (const item of staging) {
      for (const artist of item.artists) {
        map.set(artist.slug, artist)
      }
    }
    for (const artist of batchArtists) {
      map.set(artist.slug, artist)
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
  }, [batchArtists, photos, staging])

  function updateStaging(id: string, patch: Partial<StagingItem>) {
    setStaging((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  async function processFiles(files: FileList | File[]) {
    const list = [...files].filter((file) => file.type.startsWith('image/'))
    if (list.length === 0) {
      setError('Please choose image files (JPEG, PNG, or WebP).')
      return
    }
    setError(null)

    const newItems: StagingItem[] = list.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      status: 'compressing',
      message: 'Reading image…',
      year: batchYear,
      date: batchDate,
      artists: [...batchArtists],
    }))
    setStaging((prev) => [...newItems, ...prev])

    await Promise.all(
      list.map(async (file, index) => {
        const item = newItems[index]!
        const result = await compressGalleryImage(file, {
          onProgress: (progress) => {
            if (progress.status === 'error') {
              updateStaging(item.id, {
                status: 'error',
                message: progress.message,
              })
              return
            }
            if (progress.status === 'ready') return
            updateStaging(item.id, {
              status: 'compressing',
              message: progress.message,
            })
          },
        })
        if (result.status === 'ready') {
          updateStaging(item.id, {
            status: 'ready',
            message: result.message,
            grid: result.grid,
            full: result.full,
          })
        } else {
          updateStaging(item.id, {
            status: 'error',
            message: result.message,
          })
        }
      }),
    )
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      void processFiles(event.target.files)
    }
    event.target.value = ''
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current += 1
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setIsDragging(false)
    if (event.dataTransfer.files?.length) {
      void processFiles(event.dataTransfer.files)
    }
  }

  function applyBatchDefaults() {
    setStaging((prev) =>
      prev.map((item) =>
        item.status === 'done'
          ? item
          : {
              ...item,
              year: batchYear,
              date: batchDate,
              artists: [...batchArtists],
            },
      ),
    )
  }

  function removeStaging(id: string) {
    setStaging((prev) => {
      const item = prev.find((row) => row.id === id)
      if (item?.grid?.previewUrl) URL.revokeObjectURL(item.grid.previewUrl)
      if (item?.full?.previewUrl) URL.revokeObjectURL(item.full.previewUrl)
      return prev.filter((row) => row.id !== id)
    })
  }

  async function uploadReady() {
    const ready = staging.filter((item) => item.status === 'ready')
    if (ready.length === 0) {
      setError('Add and compress at least one photo first.')
      return
    }
    for (const item of ready) {
      if (!item.year.trim() || !/^\d{4}$/.test(item.year.trim())) {
        setError(`“${item.fileName}” needs a valid year (YYYY).`)
        return
      }
      if (item.artists.length === 0) {
        setError(`“${item.fileName}” needs at least one artist.`)
        return
      }
      if (!item.grid || !item.full) {
        setError(`“${item.fileName}” is missing compressed images.`)
        return
      }
    }

    setSaving(true)
    setError(null)
    const completedIds: string[] = []
    try {
      for (const item of ready) {
        updateStaging(item.id, {
          status: 'uploading',
          message: 'Uploading…',
        })
        const grid = item.grid!
        const full = item.full!
        const [gridUpload, fullUpload] = await Promise.all([
          adminUploadGalleryImage({
            blob: grid.blob,
            filename: grid.filename,
            contentType: grid.contentType,
            size: 'grid',
          }),
          adminUploadGalleryImage({
            blob: full.blob,
            filename: full.filename,
            contentType: full.contentType,
            size: 'full',
          }),
        ])
        await adminCreatePhoto({
          year: item.year.trim(),
          date: item.date.trim() || undefined,
          artists: item.artists,
          width: full.width,
          height: full.height,
          gridWidth: grid.width,
          gridHeight: grid.height,
          gridKey: gridUpload.key,
          fullKey: fullUpload.key,
          contentType: full.contentType,
        })
        completedIds.push(item.id)
        if (item.grid?.previewUrl) URL.revokeObjectURL(item.grid.previewUrl)
        if (item.full?.previewUrl) URL.revokeObjectURL(item.full.previewUrl)
      }
      clearGalleryCache()
      setReloadToken((n) => n + 1)
      setStaging((prev) =>
        prev.filter((item) => !completedIds.includes(item.id)),
      )
    } catch (err) {
      setStaging((prev) =>
        prev
          .filter((item) => !completedIds.includes(item.id))
          .map((item) =>
            item.status === 'uploading'
              ? {
                  ...item,
                  status: 'ready' as const,
                  message: 'Ready — previous upload attempt failed.',
                }
              : item,
          ),
      )
      if (completedIds.length) {
        clearGalleryCache()
        setReloadToken((n) => n + 1)
      }
      setError(
        err instanceof Error
          ? err.message
          : `Upload failed after ${completedIds.length} photo(s)`,
      )
    } finally {
      setSaving(false)
    }
  }

  function startEdit(photo: GalleryPhotoRecord) {
    setEditingId(photo.id)
    setEditDraft({
      year: photo.year,
      date: photo.date ?? '',
      artists: [...photo.artists],
    })
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingId || !editDraft) return
    if (!/^\d{4}$/.test(editDraft.year.trim())) {
      setError('Year must be YYYY')
      return
    }
    if (editDraft.artists.length === 0) {
      setError('At least one artist is required')
      return
    }
    setBusyId(editingId)
    setError(null)
    try {
      await adminUpdatePhoto(editingId, {
        year: editDraft.year.trim(),
        date: editDraft.date.trim() || undefined,
        artists: editDraft.artists,
      })
      clearGalleryCache()
      setEditingId(null)
      setEditDraft(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(photo: GalleryPhotoRecord) {
    if (
      !window.confirm(
        `Delete photo of ${photo.artistLabel} (${photo.year})? This cannot be undone.`,
      )
    ) {
      return
    }
    setBusyId(photo.id)
    setError(null)
    try {
      await adminDeletePhoto(photo.id)
      clearGalleryCache()
      if (editingId === photo.id) {
        setEditingId(null)
        setEditDraft(null)
      }
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }


  const readyCount = staging.filter((item) => item.status === 'ready').length

  function toggleYearCollapsed(year: string) {
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  function expandAllYears() {
    setCollapsedYears(new Set())
  }

  function collapseAllYears() {
    setCollapsedYears(new Set(libraryGroups.map((group) => group.year)))
  }

  function renderPhotoCard(photo: GalleryPhotoRecord) {
    return (
      <li key={photo.id} className="admin-gallery-card">
        <img src={thumbUrl(photo)} alt="" className="admin-gallery-card-img" />
        {editingId === photo.id && editDraft ? (
          <form className="admin-gallery-edit" onSubmit={saveEdit}>
            <label className="form-field">
              <span>Year</span>
              <input
                type="text"
                inputMode="numeric"
                value={editDraft.year}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, year: event.target.value })
                }
                required
              />
            </label>
            <label className="form-field">
              <span>Date</span>
              <input
                type="date"
                value={editDraft.date}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, date: event.target.value })
                }
              />
            </label>
            <div className="form-field">
              <span>Artists</span>
              <ArtistTagsInput
                id={`edit-artists-${photo.id}`}
                artists={editDraft.artists}
                suggestions={artistSuggestions}
                onChange={(artists) =>
                  setEditDraft({ ...editDraft, artists })
                }
              />
            </div>
            <div className="admin-gallery-edit-actions">
              <button
                type="submit"
                className="admin-action-btn"
                disabled={busyId === photo.id}
              >
                Save
              </button>
              <button
                type="button"
                className="admin-action-btn"
                onClick={() => {
                  setEditingId(null)
                  setEditDraft(null)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="admin-gallery-card-body">
            <p className="admin-gallery-card-title">{photo.artistLabel}</p>
            <p className="admin-gallery-card-meta">
              {photo.date ? formatGalleryDate(photo.date) : photo.year}
            </p>
            <div className="admin-gallery-card-actions">
              <button
                type="button"
                className="admin-action-btn"
                onClick={() => startEdit(photo)}
              >
                Edit
              </button>
              <button
                type="button"
                className="admin-post-delete"
                disabled={busyId === photo.id}
                onClick={() => void onDelete(photo)}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <main className="page admin-page">
      <header className="admin-page-header">
        <div>
          <h1 className="page-title">Gallery</h1>
          <p className="page-lede">Upload photos to the gallery here.</p>
        </div>
      </header>

      {error ? (
        <p className="news-error" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className="admin-gallery-upload"
        aria-labelledby="gallery-upload-heading"
      >
        <h2 id="gallery-upload-heading" className="admin-section-title">
          Upload photos
        </h2>

        <div
          className={`admin-gallery-drop${isDragging ? ' is-dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            className="visually-hidden"
            onChange={handleFileChange}
          />
          <p className="admin-gallery-drop-copy">
            Drop photos here, or{' '}
            <button
              type="button"
              className="admin-inline-link"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="admin-gallery-drop-hint">
            You can upload multiple photos at once. Each is resized before upload.
          </p>
        </div>

        <div className="admin-gallery-apply">
          <div className="admin-gallery-apply-header">
            <h3 className="admin-gallery-apply-title">Apply to all</h3>
            <p className="admin-gallery-apply-lede">
              Batch apply the same values to all photos in the staging list.
            </p>
          </div>
          <div className="admin-gallery-apply-fields">
            <label className="form-field">
              <span>Year</span>
              <input
                type="text"
                inputMode="numeric"
                value={batchYear}
                onChange={(event) => setBatchYear(event.target.value)}
                placeholder="YYYY"
              />
            </label>
            <label className="form-field">
              <span>Date (optional)</span>
              <input
                type="date"
                value={batchDate}
                onChange={(event) => setBatchDate(event.target.value)}
              />
            </label>
            <div className="form-field admin-gallery-apply-artists">
              <span>Artists</span>
              <ArtistTagsInput
                id="batch-artists"
                artists={batchArtists}
                suggestions={artistSuggestions}
                onChange={setBatchArtists}
              />
            </div>
          </div>
          <div className="admin-gallery-apply-actions">
            <button
              type="button"
              className="admin-action-btn"
              onClick={applyBatchDefaults}
              disabled={staging.length === 0}
            >
              Apply to all
            </button>
          </div>
        </div>

        {staging.length > 0 ? (
          <ul className="admin-gallery-staging">
            {staging.map((item) => (
              <li key={item.id} className="admin-gallery-staging-item">
                <div className="admin-gallery-staging-preview">
                  {item.grid?.previewUrl ? (
                    <img src={item.grid.previewUrl} alt="" />
                  ) : (
                    <div className="admin-gallery-staging-placeholder" />
                  )}
                </div>
                <div className="admin-gallery-staging-meta">
                  <p className="admin-gallery-staging-name">{item.fileName}</p>
                  <p
                    className={`gig-image-status${
                      item.status === 'error'
                        ? ' is-error'
                        : item.status === 'ready' || item.status === 'done'
                          ? ' is-ready'
                          : ''
                    }`}
                    role="status"
                  >
                    {item.message}
                    {item.grid && item.full
                      ? ` (${formatBytes(item.grid.bytes)} / ${formatBytes(item.full.bytes)})`
                      : ''}
                  </p>
                  <div className="admin-gallery-staging-fields">
                    <label className="form-field">
                      <span>Year</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.year}
                        disabled={
                          item.status === 'uploading' || item.status === 'done'
                        }
                        onChange={(event) =>
                          updateStaging(item.id, { year: event.target.value })
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Date</span>
                      <input
                        type="date"
                        value={item.date}
                        disabled={
                          item.status === 'uploading' || item.status === 'done'
                        }
                        onChange={(event) =>
                          updateStaging(item.id, { date: event.target.value })
                        }
                      />
                    </label>
                    <div className="form-field">
                      <span>Artists</span>
                      <ArtistTagsInput
                        id={`staging-artists-${item.id}`}
                        artists={item.artists}
                        suggestions={artistSuggestions}
                        onChange={(artists) =>
                          updateStaging(item.id, { artists })
                        }
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-post-delete"
                  disabled={item.status === 'uploading'}
                  onClick={() => removeStaging(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-primary-link"
            disabled={saving || readyCount === 0}
            onClick={() => void uploadReady()}
          >
            {saving
              ? 'Uploading…'
              : readyCount
                ? `Upload ${readyCount} photo${readyCount === 1 ? '' : 's'}`
                : 'Upload photos'}
          </button>
        </div>
      </section>

      <section
        className="admin-gallery-library"
        aria-labelledby="gallery-library-heading"
      >
        <div className="admin-gallery-library-header">
          <div>
            <h2 id="gallery-library-heading" className="admin-section-title">
              Library
            </h2>
            {photos && photos.length > 0 ? (
              <p className="admin-gallery-library-count">
                {photos.length} photo{photos.length === 1 ? '' : 's'}
                {libraryGroups.length > 1
                  ? ` · ${libraryGroups.length} years`
                  : ''}
              </p>
            ) : null}
          </div>
          {libraryGroups.length > 1 ? (
            <div className="admin-gallery-library-tools">
              <button
                type="button"
                className="admin-action-btn"
                onClick={expandAllYears}
              >
                Expand all
              </button>
              <button
                type="button"
                className="admin-action-btn"
                onClick={collapseAllYears}
              >
                Collapse all
              </button>
            </div>
          ) : null}
        </div>

        {photos === null ? (
          <p className="admin-loading">Loading gallery…</p>
        ) : photos.length === 0 ? (
          <div className="admin-empty">
            <p className="page-lede">No gallery photos yet.</p>
          </div>
        ) : (
          <>
            {libraryGroups.length > 1 ? (
              <div
                className="admin-gallery-year-filter"
                role="group"
                aria-label="Filter library by year"
              >
                <button
                  type="button"
                  className={
                    libraryYear === 'all'
                      ? 'admin-gallery-year-chip is-active'
                      : 'admin-gallery-year-chip'
                  }
                  aria-pressed={libraryYear === 'all'}
                  onClick={() => setLibraryYear('all')}
                >
                  All years
                </button>
                {libraryGroups.map((group) => (
                  <button
                    key={group.year}
                    type="button"
                    className={
                      libraryYear === group.year
                        ? 'admin-gallery-year-chip is-active'
                        : 'admin-gallery-year-chip'
                    }
                    aria-pressed={libraryYear === group.year}
                    onClick={() => {
                      setLibraryYear(group.year)
                      setCollapsedYears((prev) => {
                        const next = new Set(prev)
                        next.delete(group.year)
                        return next
                      })
                    }}
                  >
                    {group.year}
                    <span className="admin-gallery-year-chip-count">
                      {group.count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="admin-gallery-year-list">
              {visibleLibraryGroups.map((group) => {
                const collapsed =
                  libraryYear === 'all' && collapsedYears.has(group.year)
                return (
                  <section
                    key={group.year}
                    className="admin-gallery-year-group"
                    aria-labelledby={`library-year-${group.year}`}
                  >
                    <button
                      type="button"
                      id={`library-year-${group.year}`}
                      className="admin-gallery-year-heading"
                      aria-expanded={!collapsed}
                      onClick={() => {
                        if (libraryYear !== 'all') return
                        toggleYearCollapsed(group.year)
                      }}
                      disabled={libraryYear !== 'all'}
                    >
                      <span className="admin-gallery-year-heading-label">
                        {group.year}
                      </span>
                      <span className="admin-gallery-year-heading-count">
                        {group.count} photo{group.count === 1 ? '' : 's'}
                      </span>
                      {libraryYear === 'all' ? (
                        <span className="admin-gallery-year-heading-toggle">
                          {collapsed ? 'Show' : 'Hide'}
                        </span>
                      ) : null}
                    </button>

                    {collapsed ? null : (
                      <div className="admin-gallery-year-body">
                        {group.dateGroups.map((dateGroup) => (
                          <div
                            key={`${group.year}-${dateGroup.key}`}
                            className="admin-gallery-date-group"
                          >
                            {group.dateGroups.length > 1 ||
                            dateGroup.key !== 'undated' ? (
                              <h4 className="admin-gallery-date-heading">
                                {dateGroup.label}
                                <span className="admin-gallery-date-count">
                                  {dateGroup.photos.length}
                                </span>
                              </h4>
                            ) : null}
                            <ul className="admin-gallery-grid">
                              {dateGroup.photos.map((photo) =>
                                renderPhotoCard(photo),
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
