import fs from 'node:fs'
import path from 'node:path'
import { imageSizeFromFile } from 'image-size/fromFile'
import type { Plugin } from 'vite'

const IMAGE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
])

export type GalleryPhotoArtist = {
  slug: string
  name: string
}

export type GalleryPhoto = {
  src: string
  year: string
  /** Raw folder name, e.g. `alan-reid+christine-kidd`. */
  folderSlug: string
  artists: GalleryPhotoArtist[]
  /** Display label, e.g. `Alan Reid & Christine Kidd`. */
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

/** Turn a folder slug like `iona-fyfe` into a display name. */
export function slugToArtistName(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Split a folder name on `+` into individual artists. */
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

function compareYearsDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true })
}

export async function buildGalleryIndex(
  galleryRoot: string,
): Promise<GalleryIndex> {
  const photos: GalleryPhoto[] = []

  if (!fs.existsSync(galleryRoot)) {
    return { years: [], artists: [], photos: [] }
  }

  const yearDirs = fs
    .readdirSync(galleryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(compareYearsDesc)

  for (const year of yearDirs) {
    const yearPath = path.join(galleryRoot, year)
    const folderDirs = fs
      .readdirSync(yearPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

    for (const folderSlug of folderDirs) {
      const folderPath = path.join(yearPath, folderSlug)
      const artists = parseFolderArtists(folderSlug)
      const artistLabel = formatArtistLabel(artists)
      const files = fs
        .readdirSync(folderPath, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            IMAGE_EXT.has(path.extname(entry.name).toLowerCase()),
        )
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

      for (const filename of files) {
        const filePath = path.join(folderPath, filename)
        let width = 1600
        let height = 1200

        try {
          const size = await imageSizeFromFile(filePath)
          if (size.width && size.height) {
            width = size.width
            height = size.height
          }
        } catch {
          // Keep fallback dimensions if probing fails.
        }

        photos.push({
          src: `/gallery/${year}/${folderSlug}/${filename}`,
          year,
          folderSlug,
          artists,
          artistLabel,
          filename,
          width,
          height,
        })
      }
    }
  }

  const artistMap = new Map<
    string,
    { slug: string; name: string; years: Set<string> }
  >()

  for (const photo of photos) {
    for (const artist of photo.artists) {
      let entry = artistMap.get(artist.slug)
      if (!entry) {
        entry = {
          slug: artist.slug,
          name: artist.name,
          years: new Set(),
        }
        artistMap.set(artist.slug, entry)
      }
      entry.years.add(photo.year)
    }
  }

  const artists = [...artistMap.values()]
    .map((artist) => ({
      slug: artist.slug,
      name: artist.name,
      years: [...artist.years].sort(compareYearsDesc),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )

  const years = [...new Set(photos.map((photo) => photo.year))].sort(
    compareYearsDesc,
  )

  return { years, artists, photos }
}

/** Scan `public/gallery/{year}/{artist}/` and write `content/gallery-index.json`. */
export function galleryIndexPlugin(rootDir: string): Plugin {
  const galleryRoot = path.join(rootDir, 'public/gallery')
  const outFile = path.join(rootDir, 'content/gallery-index.json')

  async function writeIndex() {
    const index = await buildGalleryIndex(galleryRoot)
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, `${JSON.stringify(index, null, 2)}\n`)
  }

  return {
    name: 'gallery-index',
    async buildStart() {
      await writeIndex()
    },
    configureServer(server) {
      void writeIndex()
      server.watcher.add(galleryRoot)

      const refresh = (file: string) => {
        if (!file.startsWith(galleryRoot)) return
        void writeIndex().then(() => {
          server.ws.send({ type: 'full-reload', path: '*' })
        })
      }

      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('addDir', refresh)
      server.watcher.on('unlinkDir', refresh)
    },
  }
}
