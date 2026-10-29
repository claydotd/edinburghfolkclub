import type { Photo } from 'react-photo-album'
import { fetchGalleryIndex } from '../gallery/api'
import type {
  GalleryPublicArtist,
  GalleryPublicIndex,
  GalleryPublicPhoto,
} from '../gallery/types'
import { formatGalleryDate } from '../gallery/types'

export type GalleryPhotoArtist = {
  slug: string
  name: string
}

export type GallerySizedImage = {
  src: string
  width: number
  height: number
}

export type GalleryPhoto = {
  id?: string
  src: string
  year: string
  date?: string
  folderSlug: string
  artists: GalleryPhotoArtist[]
  artistLabel: string
  filename: string
  width: number
  height: number
  /** Smallest first. `src` is the largest, used by the lightbox. */
  srcSet?: GallerySizedImage[]
}

export type GalleryArtist = {
  slug: string
  name: string
  years: string[]
}

export type GalleryIndex = {
  years: string[]
  artists: GalleryArtist[]
  photos: GalleryPhoto[]
  updatedAt?: string
}

export type GalleryAlbumPhoto = Photo & {
  artists: GalleryPhotoArtist[]
  artistLabel: string
  year: string
  date?: string
  /** Full-size derivative. The album `src` stays on the smaller grid file. */
  fullSrc: string
}

let cachedIndex: GalleryIndex | null = null
let inflight: Promise<GalleryIndex> | null = null

function toGalleryIndex(index: GalleryPublicIndex): GalleryIndex {
  return {
    years: index.years,
    artists: index.artists as GalleryPublicArtist[],
    photos: index.photos as GalleryPublicPhoto[],
    updatedAt: index.updatedAt,
  }
}

export function clearGalleryCache() {
  cachedIndex = null
  inflight = null
}

export async function loadGalleryIndex(
  options: { force?: boolean } = {},
): Promise<GalleryIndex> {
  if (!options.force && cachedIndex) return cachedIndex
  if (!options.force && inflight) return inflight

  inflight = fetchGalleryIndex()
    .then((index) => {
      cachedIndex = toGalleryIndex(index)
      return cachedIndex
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function photoIncludesArtist(photo: GalleryPhoto, artistSlug: string) {
  return photo.artists.some((artist) => artist.slug === artistSlug)
}

export function captionForPhoto(photo: {
  artistLabel: string
  year: string
  date?: string
}) {
  const when = photo.date ? formatGalleryDate(photo.date) : photo.year
  return [photo.artistLabel, when].filter(Boolean).join(' · ')
}

export function toAlbumPhotos(
  photos: GalleryPhoto[],
  resolveSrc: (src: string) => string,
): GalleryAlbumPhoto[] {
  return photos.map((photo) => {
    const sources = photo.srcSet?.length
      ? photo.srcSet
      : [{ src: photo.src, width: photo.width, height: photo.height }]
    const full = sources[sources.length - 1]!
    // Leave the lightbox file out of srcSet. On a 2× screen the browser would
    // otherwise skip the grid size and download the large file for every thumbnail.
    const gridSources = sources.length > 1 ? sources.slice(0, -1) : sources
    const grid = gridSources[0]!
    const caption = captionForPhoto(photo)

    return {
      src: resolveSrc(grid.src),
      width: full.width,
      height: full.height,
      srcSet: gridSources.map((image) => ({
        src: resolveSrc(image.src),
        width: image.width,
        height: image.height,
      })),
      fullSrc: resolveSrc(full.src),
      alt: caption,
      key: photo.id ?? photo.src,
      artists: photo.artists,
      artistLabel: photo.artistLabel,
      year: photo.year,
      date: photo.date,
    }
  })
}

export function photosByYear(photos: GalleryPhoto[]) {
  const map = new Map<string, GalleryPhoto[]>()
  for (const photo of photos) {
    const list = map.get(photo.year) ?? []
    list.push(photo)
    map.set(photo.year, list)
  }
  return map
}

export function groupArtistsByLetter(
  artists: GalleryArtist[],
): { letter: string; artists: GalleryArtist[] }[] {
  const groups = new Map<string, GalleryArtist[]>()

  for (const artist of artists) {
    const letter = (artist.name[0] ?? '#').toUpperCase()
    const key = /[A-Z]/.test(letter) ? letter : '#'
    const list = groups.get(key) ?? []
    list.push(artist)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    .map(([letter, list]) => ({ letter, artists: list }))
}
