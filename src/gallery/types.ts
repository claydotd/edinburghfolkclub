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

export function artistNameToSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

export function publicGalleryImagePath(key: string): string {
  return `/.netlify/functions/gallery?resource=image&key=${encodeURIComponent(key)}`
}

export function formatGalleryDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
