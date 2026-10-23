import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import sharp from 'sharp'
import type { Plugin } from 'vite'

/** Grid thumbnail: enough for a ~280px-tall row at 2×. */
const GRID_WIDTH = 800
/** Lightbox size: sharp on a laptop, far smaller than the camera original. */
const FULL_WIDTH = 1600

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

export type GallerySizedImage = {
  src: string
  width: number
  height: number
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
  /** Smallest first. `src` matches the largest entry. */
  srcSet: GallerySizedImage[]
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

function webpName(filename: string) {
  return filename.replace(/\.[^.]+$/, '.webp')
}

function derivativeUrl(
  width: number,
  year: string,
  folderSlug: string,
  filename: string,
) {
  return `/gallery-opt/${width}/${year}/${folderSlug}/${webpName(filename)}`
}

async function renderDerivative(
  sourcePath: string,
  destPath: string,
  maxEdge: number,
): Promise<{ width: number; height: number }> {
  const sourceMtime = fs.statSync(sourcePath).mtimeMs
  if (fs.existsSync(destPath) && fs.statSync(destPath).mtimeMs >= sourceMtime) {
    const cached = await sharp(destPath).metadata()
    if (cached.width && cached.height) {
      return { width: cached.width, height: cached.height }
    }
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  const info = await sharp(sourcePath)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 76 })
    .toFile(destPath)

  return {
    width: info.width ?? maxEdge,
    height: info.height ?? maxEdge,
  }
}

function stripBase(urlPath: string, base: string) {
  if (!base || base === '/') return urlPath
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  if (urlPath === prefix) return '/'
  if (urlPath.startsWith(`${prefix}/`)) return urlPath.slice(prefix.length)
  return urlPath
}

function cacheFileForUrl(pathname: string, cacheDir: string) {
  if (!pathname.startsWith('/gallery-opt/') || pathname.includes('..')) return null
  const file = path.resolve(cacheDir, pathname.slice(1))
  const root = path.resolve(cacheDir)
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) return null
  return file
}

function serveCachedDerivative(
  req: IncomingMessage,
  res: ServerResponse,
  base: string,
  cacheDir: string,
) {
  const pathname = stripBase(req.url?.split('?')[0] ?? '', base)
  const file = cacheFileForUrl(pathname, cacheDir)
  if (!file || !fs.existsSync(file)) return false
  res.setHeader('Content-Type', 'image/webp')
  res.setHeader('Cache-Control', 'public, max-age=604800')
  fs.createReadStream(file).pipe(res)
  return true
}

export async function buildGalleryIndex(
  galleryRoot: string,
  cacheDir: string,
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
        const fullUrl = derivativeUrl(FULL_WIDTH, year, folderSlug, filename)
        const full = await renderDerivative(
          filePath,
          path.join(cacheDir, fullUrl.slice(1)),
          FULL_WIDTH,
        )

        const srcSet: GallerySizedImage[] = []
        if (full.width > GRID_WIDTH || full.height > GRID_WIDTH) {
          const gridUrl = derivativeUrl(GRID_WIDTH, year, folderSlug, filename)
          const grid = await renderDerivative(
            filePath,
            path.join(cacheDir, gridUrl.slice(1)),
            GRID_WIDTH,
          )
          srcSet.push({ src: gridUrl, width: grid.width, height: grid.height })
        }
        srcSet.push({ src: fullUrl, width: full.width, height: full.height })

        photos.push({
          src: fullUrl,
          year,
          folderSlug,
          artists,
          artistLabel,
          filename,
          width: full.width,
          height: full.height,
          srcSet,
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
  const cacheDir = path.join(rootDir, '.cache')

  async function writeIndex() {
    const index = await buildGalleryIndex(galleryRoot, cacheDir)
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, `${JSON.stringify(index, null, 2)}\n`)
  }

  return {
    name: 'gallery-index',
    async buildStart() {
      await writeIndex()
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          if (serveCachedDerivative(req, res, server.config.base, cacheDir)) return
        } catch (err) {
          next(err)
          return
        }
        next()
      })
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
    writeBundle(output) {
      const outDir = output.dir
      if (!outDir) return
      const optimized = path.join(cacheDir, 'gallery-opt')
      if (!fs.existsSync(optimized)) return
      fs.cpSync(optimized, path.join(outDir, 'gallery-opt'), { recursive: true })
    },
  }
}
