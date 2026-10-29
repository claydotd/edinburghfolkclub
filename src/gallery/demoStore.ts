import type {
  GalleryPhotoInput,
  GalleryPhotoRecord,
  GalleryPhotoUpdateInput,
  GalleryPublicIndex,
  GalleryState,
} from './types'
import {
  formatArtistLabel,
  publicGalleryImagePath,
} from './types'

const DATA_KEY = 'efc-gallery-demo-v1'
const AUTH_KEY = 'efc-news-demo-auth'

function emptyState(): GalleryState {
  return {
    photos: [],
    updatedAt: new Date().toISOString(),
  }
}

function sortPhotos(photos: GalleryPhotoRecord[]): GalleryPhotoRecord[] {
  return [...photos].sort((a, b) => {
    if (a.year !== b.year) return b.year.localeCompare(a.year, undefined, { numeric: true })
    const aDate = a.date ?? ''
    const bDate = b.date ?? ''
    if (aDate !== bDate) return bDate.localeCompare(aDate)
    return b.createdAt.localeCompare(a.createdAt)
  })
}

function readState(): GalleryState {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<GalleryState>
    if (!Array.isArray(parsed.photos)) return emptyState()
    return {
      photos: sortPhotos(parsed.photos as GalleryPhotoRecord[]),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return emptyState()
  }
}

function writeState(state: GalleryState) {
  localStorage.setItem(DATA_KEY, JSON.stringify(state))
}

function requireAuth() {
  if (sessionStorage.getItem(AUTH_KEY) !== '1') {
    throw new Error('Unauthorized')
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), 40)
  })
}

function compareYearsDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true })
}

function toPublicIndex(state: GalleryState): GalleryPublicIndex {
  const photos = sortPhotos(state.photos).map((photo) => {
    const gridSrc =
      photo.gridKey.startsWith('data:') || photo.gridKey.startsWith('blob:')
        ? photo.gridKey
        : publicGalleryImagePath(photo.gridKey)
    const fullSrc =
      photo.fullKey.startsWith('data:') || photo.fullKey.startsWith('blob:')
        ? photo.fullKey
        : publicGalleryImagePath(photo.fullKey)
    return {
      id: photo.id,
      src: fullSrc,
      year: photo.year,
      date: photo.date,
      folderSlug: photo.artists.map((a) => a.slug).join('+') || 'unknown',
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
  })

  const years = [...new Set(photos.map((p) => p.year))].sort(compareYearsDesc)
  const artistMap = new Map<
    string,
    { slug: string; name: string; years: string[] }
  >()
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

  return {
    years,
    artists: [...artistMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    ),
    photos,
    updatedAt: state.updatedAt,
  }
}

export async function fetchGalleryIndex(): Promise<GalleryPublicIndex> {
  return delay(toPublicIndex(readState()))
}

export async function listPhotos(): Promise<GalleryState> {
  requireAuth()
  return delay(readState())
}

export async function createPhoto(
  input: GalleryPhotoInput,
): Promise<GalleryPhotoRecord> {
  requireAuth()
  const now = new Date().toISOString()
  const artists = input.artists.filter((a) => a.name.trim())
  const photo: GalleryPhotoRecord = {
    id: crypto.randomUUID(),
    year: input.year.trim(),
    date: input.date?.trim() || undefined,
    artists,
    artistLabel: formatArtistLabel(artists),
    width: input.width,
    height: input.height,
    gridWidth: input.gridWidth,
    gridHeight: input.gridHeight,
    gridKey: input.gridKey,
    fullKey: input.fullKey,
    contentType: input.contentType ?? 'image/webp',
    createdAt: now,
    updatedAt: now,
  }
  const state = readState()
  writeState({
    photos: sortPhotos([...state.photos, photo]),
    updatedAt: now,
  })
  return delay(photo)
}

export async function updatePhoto(
  id: string,
  input: GalleryPhotoUpdateInput,
): Promise<GalleryPhotoRecord> {
  requireAuth()
  const state = readState()
  const index = state.photos.findIndex((p) => p.id === id)
  if (index < 0) throw new Error('Photo not found')
  const existing = state.photos[index]!
  const artists = input.artists.filter((a) => a.name.trim())
  const photo: GalleryPhotoRecord = {
    ...existing,
    year: input.year.trim(),
    date: input.date?.trim() || undefined,
    artists,
    artistLabel: formatArtistLabel(artists),
    updatedAt: new Date().toISOString(),
  }
  const next = [...state.photos]
  next[index] = photo
  writeState({
    photos: sortPhotos(next),
    updatedAt: photo.updatedAt,
  })
  return delay(photo)
}

export async function deletePhoto(id: string): Promise<void> {
  requireAuth()
  const state = readState()
  const next = state.photos.filter((p) => p.id !== id)
  if (next.length === state.photos.length) throw new Error('Photo not found')
  writeState({
    photos: next,
    updatedAt: new Date().toISOString(),
  })
  await delay(undefined)
}

export async function uploadImage(input: {
  filename?: string
  contentType?: string
  dataBase64: string
  size?: 'grid' | 'full'
}): Promise<{ key: string; imagepath: string }> {
  requireAuth()
  const raw = input.dataBase64.includes(',')
    ? input.dataBase64.split(',').pop()!
    : input.dataBase64
  const contentType = (input.contentType ?? 'image/jpeg').split(';')[0]
  const dataUrl = `data:${contentType};base64,${raw}`
  const key = dataUrl
  return delay({ key, imagepath: dataUrl })
}
