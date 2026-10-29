import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getStore } from '@netlify/blobs'
import { localDataDir, shouldUseLocalStore } from './localDataDir.ts'
import type {
  GalleryImageUpload,
  GalleryPhotoInput,
  GalleryPhotoRecord,
  GalleryPhotoUpdateInput,
  GalleryState,
} from './galleryTypes.ts'
import {
  GALLERY_FULL_MAX_BYTES,
  GALLERY_GRID_MAX_BYTES,
  coerceGalleryState,
  emptyGalleryState,
  formatArtistLabel,
  normalizeArtists,
  normalizeGalleryPhoto,
  parseGalleryImageKey,
  publicGalleryImagePath,
  sortGalleryPhotos,
} from './galleryTypes.ts'

const GALLERY_BLOB_STORE = 'gallery'
const GALLERY_LIST_KEY = 'list'
const GALLERY_IMAGES_BLOB_STORE = 'gallery-images'

function galleryFile(): string {
  return path.join(localDataDir(), 'gallery-local.json')
}

function imagesDir(): string {
  return path.join(localDataDir(), 'gallery-images')
}

function readLocalGallery(): GalleryState {
  const file = galleryFile()
  try {
    if (!fs.existsSync(file)) return emptyGalleryState()
    const raw = fs.readFileSync(file, 'utf8')
    return coerceGalleryState(JSON.parse(raw))
  } catch {
    return emptyGalleryState()
  }
}

function writeLocalGallery(state: GalleryState) {
  const file = galleryFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8')
}

async function galleryBlobStore() {
  return getStore({ name: GALLERY_BLOB_STORE, consistency: 'eventual' })
}

async function imagesBlobStore() {
  return getStore({
    name: GALLERY_IMAGES_BLOB_STORE,
    consistency: 'eventual',
  })
}

async function readBlobGallery(): Promise<GalleryState> {
  try {
    const store = await galleryBlobStore()
    const value = await store.get(GALLERY_LIST_KEY, { type: 'json' })
    return coerceGalleryState(value)
  } catch {
    return emptyGalleryState()
  }
}

async function writeBlobGallery(state: GalleryState): Promise<void> {
  const store = await galleryBlobStore()
  await store.setJSON(GALLERY_LIST_KEY, state)
}

async function readGallery(): Promise<GalleryState> {
  if (shouldUseLocalStore()) return readLocalGallery()
  return readBlobGallery()
}

async function writeGallery(state: GalleryState): Promise<void> {
  if (shouldUseLocalStore()) {
    writeLocalGallery(state)
    return
  }
  await writeBlobGallery(state)
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

function decodeImageUpload(upload: GalleryImageUpload): {
  buffer: Buffer
  contentType: string
  key: string
} {
  const contentType = (upload.contentType ?? 'image/jpeg').split(';')[0].trim()
  if (!contentType.startsWith('image/')) {
    throw new Error('Upload must be an image')
  }
  const raw = upload.dataBase64.includes(',')
    ? upload.dataBase64.split(',').pop()!
    : upload.dataBase64
  const buffer = Buffer.from(raw, 'base64')
  if (!buffer.length) throw new Error('Image data is empty')
  const maxBytes =
    upload.size === 'grid' ? GALLERY_GRID_MAX_BYTES : GALLERY_FULL_MAX_BYTES
  if (buffer.length > maxBytes) {
    throw new Error(
      `Image must be under ${Math.round(maxBytes / 1024)}KB (${upload.size ?? 'full'})`,
    )
  }
  const key = `${randomUUID()}.${extensionForContentType(contentType)}`
  return { buffer, contentType, key }
}

function writeLocalImage(key: string, buffer: Buffer, contentType: string) {
  const dir = imagesDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, key), buffer)
  fs.writeFileSync(
    path.join(dir, `${key}.meta.json`),
    JSON.stringify({ contentType }, null, 2),
    'utf8',
  )
}

function readLocalImage(
  key: string,
): { buffer: Buffer; contentType: string } | null {
  const filePath = path.join(imagesDir(), key)
  if (!fs.existsSync(filePath)) return null
  const buffer = fs.readFileSync(filePath)
  let contentType = 'image/jpeg'
  try {
    const meta = JSON.parse(
      fs.readFileSync(path.join(imagesDir(), `${key}.meta.json`), 'utf8'),
    ) as { contentType?: string }
    if (meta.contentType) contentType = meta.contentType
  } catch {
    // keep default
  }
  return { buffer, contentType }
}

function deleteLocalImage(key: string) {
  const filePath = path.join(imagesDir(), key)
  const metaPath = path.join(imagesDir(), `${key}.meta.json`)
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {
    // ignore
  }
  try {
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath)
  } catch {
    // ignore
  }
}

export const galleryStore = {
  async list(): Promise<GalleryState> {
    const state = await readGallery()
    return {
      photos: sortGalleryPhotos(state.photos),
      updatedAt: state.updatedAt,
    }
  },

  async getById(id: string): Promise<GalleryPhotoRecord | null> {
    const state = await readGallery()
    return state.photos.find((photo) => photo.id === id) ?? null
  },

  async create(input: GalleryPhotoInput): Promise<GalleryPhotoRecord> {
    const state = await readGallery()
    const photo = normalizeGalleryPhoto(input)
    const next: GalleryState = {
      photos: sortGalleryPhotos([...state.photos, photo]),
      updatedAt: new Date().toISOString(),
    }
    await writeGallery(next)
    return photo
  },

  async update(
    id: string,
    input: GalleryPhotoUpdateInput,
  ): Promise<GalleryPhotoRecord> {
    const state = await readGallery()
    const index = state.photos.findIndex((photo) => photo.id === id)
    if (index < 0) throw new Error('Photo not found')
    const existing = state.photos[index]!
    const artists = normalizeArtists(input.artists)
    const date =
      typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())
        ? input.date.trim()
        : undefined
    const photo: GalleryPhotoRecord = {
      ...existing,
      year: input.year.trim(),
      date,
      artists,
      artistLabel: formatArtistLabel(artists),
      updatedAt: new Date().toISOString(),
    }
    const photos = [...state.photos]
    photos[index] = photo
    const next: GalleryState = {
      photos: sortGalleryPhotos(photos),
      updatedAt: photo.updatedAt,
    }
    await writeGallery(next)
    return photo
  },

  async remove(id: string): Promise<void> {
    const state = await readGallery()
    const photo = state.photos.find((item) => item.id === id)
    if (!photo) throw new Error('Photo not found')
    const next: GalleryState = {
      photos: state.photos.filter((item) => item.id !== id),
      updatedAt: new Date().toISOString(),
    }
    await writeGallery(next)
    await this.deleteImage(photo.gridKey)
    await this.deleteImage(photo.fullKey)
  },

  async uploadImage(
    upload: GalleryImageUpload,
  ): Promise<{ key: string; imagepath: string }> {
    const { buffer, contentType, key } = decodeImageUpload(upload)
    if (shouldUseLocalStore()) {
      writeLocalImage(key, buffer, contentType)
    } else {
      const store = await imagesBlobStore()
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer
      await store.set(key, arrayBuffer, {
        metadata: { contentType },
      })
    }
    return { key, imagepath: publicGalleryImagePath(key) }
  },

  async getImage(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const safe = parseGalleryImageKey(key)
    if (!safe) return null
    if (shouldUseLocalStore()) return readLocalImage(safe)
    try {
      const store = await imagesBlobStore()
      const result = await store.getWithMetadata(safe, { type: 'arrayBuffer' })
      if (!result) return null
      const contentType =
        typeof result.metadata?.contentType === 'string'
          ? result.metadata.contentType
          : 'image/jpeg'
      return { buffer: Buffer.from(result.data), contentType }
    } catch {
      return null
    }
  },

  async deleteImage(key: string): Promise<void> {
    const safe = parseGalleryImageKey(key)
    if (!safe) return
    if (shouldUseLocalStore()) {
      deleteLocalImage(safe)
      return
    }
    try {
      const store = await imagesBlobStore()
      await store.delete(safe)
    } catch {
      // ignore missing
    }
  },
}
