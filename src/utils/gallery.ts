import type { Photo } from 'react-photo-album'
import galleryIndex from '../../content/gallery-index.json'

export type GalleryPhotoArtist = {
  slug: string
  name: string
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
}

export const gallery = galleryIndex as GalleryIndex

export function photoIncludesArtist(photo: GalleryPhoto, artistSlug: string) {
  return photo.artists.some((artist) => artist.slug === artistSlug)
}

export function toAlbumPhotos(
  photos: GalleryPhoto[],
  resolveSrc: (src: string) => string,
): GalleryAlbumPhoto[] {
  return photos.map((photo) => ({
    src: resolveSrc(photo.src),
    width: photo.width,
    height: photo.height,
    alt: `${photo.artistLabel}, ${photo.year}`,
    key: photo.src,
    artists: photo.artists,
    artistLabel: photo.artistLabel,
    year: photo.year,
  }))
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
