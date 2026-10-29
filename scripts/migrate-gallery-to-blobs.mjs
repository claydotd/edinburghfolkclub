#!/usr/bin/env node
/**
 * One-time migration: public/gallery/{year}/{folderSlug}/* → local .data gallery store
 * (same layout the Netlify gallery function uses in Vite / NEWS_USE_LOCAL=1).
 *
 * Usage: node scripts/migrate-gallery-to-blobs.mjs
 *
 * For production Blobs, run with netlify functions env configured, or re-upload
 * via /admin/gallery after deploy. This script always writes the local file store.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const sourceRoot = path.join(rootDir, 'public', 'gallery')
const dataDir = path.join(rootDir, '.data')
const imagesDir = path.join(dataDir, 'gallery-images')
const stateFile = path.join(dataDir, 'gallery-local.json')

const GRID_EDGE = 800
const FULL_EDGE = 1600
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

function slugToArtistName(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseFolderArtists(folderSlug) {
  return folderSlug
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((slug) => ({
      slug,
      name: slugToArtistName(slug),
    }))
}

function formatArtistLabel(artists) {
  if (artists.length === 0) return 'Unknown'
  if (artists.length === 1) return artists[0].name
  if (artists.length === 2) {
    return `${artists[0].name} & ${artists[1].name}`
  }
  const lead = artists
    .slice(0, -1)
    .map((artist) => artist.name)
    .join(', ')
  return `${lead} & ${artists.at(-1).name}`
}

async function renderDerivative(sourcePath, maxEdge) {
  const image = sharp(sourcePath).rotate()
  const meta = await image.metadata()
  const width = meta.width || maxEdge
  const height = meta.height || maxEdge
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))
  const buffer = await sharp(sourcePath)
    .rotate()
    .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer()
  const outMeta = await sharp(buffer).metadata()
  return {
    buffer,
    width: outMeta.width || targetW,
    height: outMeta.height || targetH,
    contentType: 'image/webp',
  }
}

function writeImage(key, buffer, contentType) {
  fs.mkdirSync(imagesDir, { recursive: true })
  fs.writeFileSync(path.join(imagesDir, key), buffer)
  fs.writeFileSync(
    path.join(imagesDir, `${key}.meta.json`),
    JSON.stringify({ contentType }, null, 2),
    'utf8',
  )
}

function listSourcePhotos() {
  if (!fs.existsSync(sourceRoot)) return []
  const photos = []
  for (const year of fs.readdirSync(sourceRoot)) {
    const yearDir = path.join(sourceRoot, year)
    if (!fs.statSync(yearDir).isDirectory() || !/^\d{4}$/.test(year)) continue
    for (const folderSlug of fs.readdirSync(yearDir)) {
      const folderDir = path.join(yearDir, folderSlug)
      if (!fs.statSync(folderDir).isDirectory()) continue
      for (const filename of fs.readdirSync(folderDir)) {
        const ext = path.extname(filename).toLowerCase()
        if (!IMAGE_EXT.has(ext)) continue
        photos.push({
          year,
          folderSlug,
          filename,
          sourcePath: path.join(folderDir, filename),
        })
      }
    }
  }
  return photos
}

async function main() {
  const sources = listSourcePhotos()
  if (sources.length === 0) {
    console.log('No photos found under public/gallery — nothing to migrate.')
    return
  }

  fs.mkdirSync(dataDir, { recursive: true })
  const existing = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    : { photos: [], updatedAt: new Date().toISOString() }
  const photos = Array.isArray(existing.photos) ? [...existing.photos] : []
  const knownSources = new Set(
    photos
      .map((photo) => photo.migrationSource)
      .filter((value) => typeof value === 'string'),
  )

  let added = 0
  for (const source of sources) {
    const relative = path.relative(sourceRoot, source.sourcePath)
    if (knownSources.has(relative)) {
      console.log(`skip (already migrated): ${relative}`)
      continue
    }

    console.log(`migrating ${relative}…`)
    const artists = parseFolderArtists(source.folderSlug)
    const [grid, full] = await Promise.all([
      renderDerivative(source.sourcePath, GRID_EDGE),
      renderDerivative(source.sourcePath, FULL_EDGE),
    ])
    const gridKey = `${randomUUID()}.webp`
    const fullKey = `${randomUUID()}.webp`
    writeImage(gridKey, grid.buffer, grid.contentType)
    writeImage(fullKey, full.buffer, full.contentType)

    const now = new Date().toISOString()
    photos.push({
      id: randomUUID(),
      year: source.year,
      artists,
      artistLabel: formatArtistLabel(artists),
      width: full.width,
      height: full.height,
      gridWidth: grid.width,
      gridHeight: grid.height,
      gridKey,
      fullKey,
      contentType: full.contentType,
      createdAt: now,
      updatedAt: now,
      migrationSource: relative,
    })
    added += 1
  }

  const state = {
    photos,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8')
  console.log(
    `Done. Added ${added} photo(s). Gallery store has ${photos.length} total at ${stateFile}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
