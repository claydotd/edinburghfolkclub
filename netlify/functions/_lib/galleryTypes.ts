export type GalleryPhotoArtist = {
  slug: string
  name: string
}

export type GalleryPhotoRecord = {
  id: string
  year: string
  date?: string
  artists: GalleryPhotoArtist[]
  artistLabel: string
  width: number
  height: number
  gridWidth: number
  gridHeight: number
  gridKey: string
  fullKey: string
  contentType: string
  createdAt: string
  updatedAt: string
}

export type GalleryPhotoInput = {
  year: string
  date?: string
  artists: GalleryPhotoArtist[]
  width: number
  height: number
  gridWidth: number
  gridHeight: number
  gridKey: string
  fullKey: string
  contentType?: string
}

export type GalleryPhotoUpdateInput = {
  year: string
  date?: string
  artists: GalleryPhotoArtist[]
}

export type GalleryState = {
  photos: GalleryPhotoRecord[]
  updatedAt: string
}

export type GalleryImageUpload = {
  filename?: string
  contentType?: string
  dataBase64: string
  /** Which derivative this upload is for. Defaults to full. */
  size?: 'grid' | 'full'
}

/** Public index shape consumed by the Gallery page. */
export type GalleryPublicPhoto = {
  id: string
  src: string
  year: string
  date?: string
  folderSlug: string
  artists: GalleryPhotoArtist[]
  artistLabel: string
  filename: string
  width: number
  height: number
  srcSet: { src: string; width: number; height: number }[]
}

export type GalleryPublicArtist = {
  slug: string
  name: string
  years: string[]
}

export type GalleryPublicIndex = {
  years: string[]
  artists: GalleryPublicArtist[]
  photos: GalleryPublicPhoto[]
  updatedAt: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const YEAR_RE = /^\d{4}$/

export const GALLERY_GRID_MAX_BYTES = 200 * 1024
export const GALLERY_FULL_MAX_BYTES = 500 * 1024

export function emptyGalleryState(): GalleryState {
  return {
    photos: [],
    updatedAt: new Date().toISOString(),
  }
}

export function artistNameToSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function slugToArtistName(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function parseFolderArtists(folderSlug: string): GalleryPhotoArtist[] {
  return folderSlug
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((slug) => ({
      slug,
      name: slugToArtistName(slug),
    }))
}

export function formatArtistLabel(artists: GalleryPhotoArtist[]): string {
  if (artists.length === 0) return 'Unknown'
  if (artists.length === 1) return artists[0]!.name
  if (artists.length === 2) {
    return `${artists[0]!.name} & ${artists[1]!.name}`
  }

  const lead = artists
    .slice(0, -1)
    .map((artist) => artist.name)
    .join(', ')
  return `${lead} & ${artists.at(-1)!.name}`
}

export function normalizeArtists(
  artists: GalleryPhotoArtist[] | undefined,
): GalleryPhotoArtist[] {
  if (!Array.isArray(artists)) return []
  const seen = new Set<string>()
  const result: GalleryPhotoArtist[] = []
  for (const raw of artists) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : ''
    if (!name) continue
    const slug =
      (typeof raw.slug === 'string' && raw.slug.trim()) ||
      artistNameToSlug(name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    result.push({ slug, name })
  }
  return result
}

export function folderSlugFromArtists(artists: GalleryPhotoArtist[]): string {
  if (artists.length === 0) return 'unknown'
  return artists.map((artist) => artist.slug).join('+')
}

export function validateGalleryPhotoInput(
  body: Partial<GalleryPhotoInput>,
): string | null {
  if (!body.year?.trim() || !YEAR_RE.test(body.year.trim())) {
    return 'Year must be YYYY'
  }
  if (body.date != null && body.date !== '' && !DATE_RE.test(body.date.trim())) {
    return 'Date must be YYYY-MM-DD'
  }
  const artists = normalizeArtists(body.artists)
  if (artists.length === 0) return 'At least one artist is required'
  if (!body.gridKey?.trim()) return 'Grid image is required'
  if (!body.fullKey?.trim()) return 'Full image is required'
  if (!Number.isFinite(body.width) || !body.width || body.width < 1) {
    return 'Width is required'
  }
  if (!Number.isFinite(body.height) || !body.height || body.height < 1) {
    return 'Height is required'
  }
  if (
    !Number.isFinite(body.gridWidth) ||
    !body.gridWidth ||
    body.gridWidth < 1
  ) {
    return 'Grid width is required'
  }
  if (
    !Number.isFinite(body.gridHeight) ||
    !body.gridHeight ||
    body.gridHeight < 1
  ) {
    return 'Grid height is required'
  }
  return null
}

export function validateGalleryPhotoUpdate(
  body: Partial<GalleryPhotoUpdateInput>,
): string | null {
  if (!body.year?.trim() || !YEAR_RE.test(body.year.trim())) {
    return 'Year must be YYYY'
  }
  if (body.date != null && body.date !== '' && !DATE_RE.test(body.date.trim())) {
    return 'Date must be YYYY-MM-DD'
  }
  if (normalizeArtists(body.artists).length === 0) {
    return 'At least one artist is required'
  }
  return null
}

export function normalizeGalleryPhoto(
  input: GalleryPhotoInput,
  existing?: GalleryPhotoRecord,
): GalleryPhotoRecord {
  const now = new Date().toISOString()
  const artists = normalizeArtists(input.artists)
  const date =
    typeof input.date === 'string' && DATE_RE.test(input.date.trim())
      ? input.date.trim()
      : undefined
  return {
    id: existing?.id ?? crypto.randomUUID(),
    year: input.year.trim(),
    date,
    artists,
    artistLabel: formatArtistLabel(artists),
    width: Math.round(input.width),
    height: Math.round(input.height),
    gridWidth: Math.round(input.gridWidth),
    gridHeight: Math.round(input.gridHeight),
    gridKey: input.gridKey.trim(),
    fullKey: input.fullKey.trim(),
    contentType: (input.contentType ?? existing?.contentType ?? 'image/webp')
      .split(';')[0]
      .trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function compareYearsDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true })
}

function comparePhotos(a: GalleryPhotoRecord, b: GalleryPhotoRecord) {
  if (a.year !== b.year) return compareYearsDesc(a.year, b.year)
  const aDate = a.date ?? ''
  const bDate = b.date ?? ''
  if (aDate !== bDate) return bDate.localeCompare(aDate)
  return b.createdAt.localeCompare(a.createdAt)
}

export function sortGalleryPhotos(
  photos: GalleryPhotoRecord[],
): GalleryPhotoRecord[] {
  return [...photos].sort(comparePhotos)
}

export function publicGalleryImagePath(key: string): string {
  return `/.netlify/functions/gallery?resource=image&key=${encodeURIComponent(key)}`
}

export function parseGalleryImageKey(
  key: string | undefined | null,
): string | null {
  if (!key) return null
  const trimmed = key.trim()
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return null
  return trimmed
}

export function recordToPublicPhoto(
  photo: GalleryPhotoRecord,
): GalleryPublicPhoto {
  const gridSrc = publicGalleryImagePath(photo.gridKey)
  const fullSrc = publicGalleryImagePath(photo.fullKey)
  return {
    id: photo.id,
    src: fullSrc,
    year: photo.year,
    date: photo.date,
    folderSlug: folderSlugFromArtists(photo.artists),
    artists: photo.artists,
    artistLabel: photo.artistLabel,
    filename: photo.id,
    width: photo.width,
    height: photo.height,
    srcSet: [
      {
        src: gridSrc,
        width: photo.gridWidth,
        height: photo.gridHeight,
      },
      {
        src: fullSrc,
        width: photo.width,
        height: photo.height,
      },
    ],
  }
}

export function buildPublicIndex(state: GalleryState): GalleryPublicIndex {
  const photos = sortGalleryPhotos(state.photos).map(recordToPublicPhoto)
  const years = [
    ...new Set(photos.map((photo) => photo.year)),
  ].sort(compareYearsDesc)

  const artistMap = new Map<string, GalleryPublicArtist>()
  for (const photo of photos) {
    for (const artist of photo.artists) {
      const existing = artistMap.get(artist.slug)
      if (existing) {
        if (!existing.years.includes(photo.year)) {
          existing.years.push(photo.year)
          existing.years.sort(compareYearsDesc)
        }
      } else {
        artistMap.set(artist.slug, {
          slug: artist.slug,
          name: artist.name,
          years: [photo.year],
        })
      }
    }
  }

  const artists = [...artistMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )

  return {
    years,
    artists,
    photos,
    updatedAt: state.updatedAt,
  }
}

function coerceArtist(raw: unknown): GalleryPhotoArtist | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const name = typeof item.name === 'string' ? item.name.trim() : ''
  const slug =
    typeof item.slug === 'string' && item.slug.trim()
      ? item.slug.trim()
      : artistNameToSlug(name)
  if (!name || !slug) return null
  return { slug, name }
}

function coercePhoto(
  raw: Record<string, unknown>,
  index: number,
): GalleryPhotoRecord {
  const now = new Date().toISOString()
  const artists = Array.isArray(raw.artists)
    ? (raw.artists.map(coerceArtist).filter(Boolean) as GalleryPhotoArtist[])
    : []
  const date =
    typeof raw.date === 'string' && DATE_RE.test(raw.date) ? raw.date : undefined
  const year =
    typeof raw.year === 'string' && YEAR_RE.test(raw.year)
      ? raw.year
      : date?.slice(0, 4) || '1970'
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : `gallery-seed-${index}`,
    year,
    date,
    artists,
    artistLabel:
      typeof raw.artistLabel === 'string' && raw.artistLabel.trim()
        ? raw.artistLabel
        : formatArtistLabel(artists),
    width: Number(raw.width) > 0 ? Math.round(Number(raw.width)) : 1600,
    height: Number(raw.height) > 0 ? Math.round(Number(raw.height)) : 1200,
    gridWidth:
      Number(raw.gridWidth) > 0 ? Math.round(Number(raw.gridWidth)) : 800,
    gridHeight:
      Number(raw.gridHeight) > 0 ? Math.round(Number(raw.gridHeight)) : 600,
    gridKey: typeof raw.gridKey === 'string' ? raw.gridKey : '',
    fullKey: typeof raw.fullKey === 'string' ? raw.fullKey : '',
    contentType:
      typeof raw.contentType === 'string' ? raw.contentType : 'image/webp',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

export function coerceGalleryState(value: unknown): GalleryState {
  if (!value || typeof value !== 'object') return emptyGalleryState()
  const raw = value as Record<string, unknown>
  const list = Array.isArray(raw.photos) ? raw.photos : []
  const photos = list
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === 'object',
    )
    .map((item, index) => coercePhoto(item, index))
  return {
    photos: sortGalleryPhotos(photos),
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : new Date().toISOString(),
  }
}
