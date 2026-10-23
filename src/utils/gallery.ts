import type { Photo } from 'react-photo-album'
import galleryIndex from '../../content/gallery-index.json'

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
  src: string
  year: string
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
}

export type GalleryAlbumPhoto = Photo & {
  artists: GalleryPhotoArtist[]
  artistLabel: string
  year: string
  /** Full-size derivative. The album `src` stays on the smaller grid file. */
  fullSrc: string
}

export const gallery = galleryIndex as GalleryIndex

export function photoIncludesArtist(photo: GalleryPhoto, artistSlug: string) {
  return photo.artists.some((artist) => artist.slug === artistSlug)
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
      alt: `${photo.artistLabel}, ${photo.year}`,
      key: photo.src,
      artists: photo.artists,
      artistLabel: photo.artistLabel,
      year: photo.year,
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
