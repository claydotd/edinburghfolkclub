import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStore } from '@netlify/blobs'
import { buildSeedGigsState } from './gigSeed.ts'
import type { Gig, GigImageUpload, GigInput, GigsState } from './gigTypes.ts'
import {
  GIG_IMAGE_MAX_BYTES,
  coerceGigsState,
  emptyGigsState,
  normalizeGig,
  parseGigImageKey,
  publicGigImagePath,
  sortGigsChronological,
} from './gigTypes.ts'

const GIGS_BLOB_STORE = 'gigs'
const GIGS_LIST_KEY = 'list'
const GIG_IMAGES_BLOB_STORE = 'gig-images'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const dataDir = path.join(rootDir, '.data')
const gigsFile = path.join(dataDir, 'gigs-local.json')
const imagesDir = path.join(dataDir, 'gig-images')

function shouldUseLocalStore(): boolean {
  return process.env.NEWS_USE_LOCAL === '1' || !process.env.NETLIFY
}

function readLocalGigs(): GigsState {
  try {
    if (!fs.existsSync(gigsFile)) {
      const seeded = buildSeedGigsState()
      writeLocalGigs(seeded)
      return seeded
    }
    const raw = fs.readFileSync(gigsFile, 'utf8')
    const parsed = coerceGigsState(JSON.parse(raw))
    if (parsed.gigs.length === 0) {
      const seeded = buildSeedGigsState()
      writeLocalGigs(seeded)
      return seeded
    }
    return parsed
  } catch {
    return buildSeedGigsState()
  }
}

function writeLocalGigs(state: GigsState) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(gigsFile, JSON.stringify(state, null, 2), 'utf8')
}

async function gigsBlobStore() {
  return getStore({ name: GIGS_BLOB_STORE, consistency: 'strong' })
}

async function imagesBlobStore() {
  return getStore({ name: GIG_IMAGES_BLOB_STORE, consistency: 'strong' })
}

async function readBlobGigs(): Promise<GigsState> {
  try {
    const store = await gigsBlobStore()
    const value = await store.get(GIGS_LIST_KEY, { type: 'json' })
    const parsed = coerceGigsState(value)
    if (parsed.gigs.length === 0) {
      const seeded = buildSeedGigsState()
      await store.setJSON(GIGS_LIST_KEY, seeded)
      return seeded
    }
    return parsed
  } catch {
    return emptyGigsState()
  }
}

async function writeBlobGigs(state: GigsState): Promise<void> {
  const store = await gigsBlobStore()
  await store.setJSON(GIGS_LIST_KEY, state)
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

function decodeImageUpload(upload: GigImageUpload): {
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
  if (buffer.length > GIG_IMAGE_MAX_BYTES) {
    throw new Error('Image must be under 4MB')
  }
  const key = `${randomUUID()}.${extensionForContentType(contentType)}`
  return { buffer, contentType, key }
}

function writeLocalImage(key: string, buffer: Buffer, contentType: string) {
  fs.mkdirSync(imagesDir, { recursive: true })
  fs.writeFileSync(path.join(imagesDir, key), buffer)
  fs.writeFileSync(
    path.join(imagesDir, `${key}.meta.json`),
    JSON.stringify({ contentType }, null, 2),
    'utf8',
  )
}

function readLocalImage(key: string): { buffer: Buffer; contentType: string } | null {
  const filePath = path.join(imagesDir, key)
  if (!fs.existsSync(filePath)) return null
  const buffer = fs.readFileSync(filePath)
  let contentType = 'image/jpeg'
  try {
    const meta = JSON.parse(
      fs.readFileSync(path.join(imagesDir, `${key}.meta.json`), 'utf8'),
    ) as { contentType?: string }
    if (meta.contentType) contentType = meta.contentType
  } catch {
    // keep default
  }
  return { buffer, contentType }
}

function deleteLocalImage(key: string) {
  const filePath = path.join(imagesDir, key)
  const metaPath = path.join(imagesDir, `${key}.meta.json`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath)
}

function imageKeyFromPath(imagepath: string): string | null {
  if (!imagepath.includes('resource=image')) return null
  try {
    const url = new URL(imagepath, 'http://localhost')
    return parseGigImageKey(url.searchParams.get('key'))
  } catch {
    return null
  }
}

export const gigStore = {
  async list(): Promise<GigsState> {
    if (shouldUseLocalStore()) return readLocalGigs()
    return readBlobGigs()
  },

  async getById(id: string): Promise<Gig | null> {
    const state = await this.list()
    return state.gigs.find((g) => g.id === id) ?? null
  },

  async create(input: GigInput): Promise<Gig> {
    const state = await this.list()
    if (state.gigs.some((g) => g.date === input.date.trim())) {
      throw new Error('A gig already exists on this date')
    }
    const gig = normalizeGig(input)
    const next: GigsState = {
      gigs: sortGigsChronological([...state.gigs, gig]),
      updatedAt: new Date().toISOString(),
    }
    if (shouldUseLocalStore()) writeLocalGigs(next)
    else await writeBlobGigs(next)
    return gig
  },

  async update(id: string, input: GigInput): Promise<Gig> {
    const state = await this.list()
    const index = state.gigs.findIndex((g) => g.id === id)
    if (index < 0) throw new Error('Gig not found')
    if (state.gigs.some((g) => g.id !== id && g.date === input.date.trim())) {
      throw new Error('A gig already exists on this date')
    }
    const previous = state.gigs[index]
    const gig = normalizeGig(input, previous)
    const nextGigs = [...state.gigs]
    nextGigs[index] = gig
    const next: GigsState = {
      gigs: sortGigsChronological(nextGigs),
      updatedAt: new Date().toISOString(),
    }
    if (shouldUseLocalStore()) writeLocalGigs(next)
    else await writeBlobGigs(next)

    const prevKey = imageKeyFromPath(previous.imagepath)
    const nextKey = imageKeyFromPath(gig.imagepath)
    if (prevKey && prevKey !== nextKey) {
      await this.deleteImage(prevKey)
    }
    return gig
  },

  async remove(id: string): Promise<void> {
    const state = await this.list()
    const gig = state.gigs.find((g) => g.id === id)
    if (!gig) throw new Error('Gig not found')
    const next: GigsState = {
      gigs: state.gigs.filter((g) => g.id !== id),
      updatedAt: new Date().toISOString(),
    }
    if (shouldUseLocalStore()) writeLocalGigs(next)
    else await writeBlobGigs(next)
    const key = imageKeyFromPath(gig.imagepath)
    if (key) await this.deleteImage(key)
  },

  async uploadImage(upload: GigImageUpload): Promise<{ key: string; imagepath: string }> {
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
    return { key, imagepath: publicGigImagePath(key) }
  },

  async getImage(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const safe = parseGigImageKey(key)
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
    const safe = parseGigImageKey(key)
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
