import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
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
import { databaseIsConfigured, getDatabaseClient } from './database.ts'
import { asIsoDate, asIsoTimestamp } from './memberTypes.ts'
import { localDataDir, shouldUseLocalStore } from './localDataDir.ts'

const GIGS_BLOB_STORE = 'gigs'
const GIGS_LIST_KEY = 'list'
const GIG_IMAGES_BLOB_STORE = 'gig-images'

function gigsFile(): string {
  return path.join(localDataDir(), 'gigs-local.json')
}

function imagesDir(): string {
  return path.join(localDataDir(), 'gig-images')
}

type DbGigRow = {
  id: string
  gig_date: unknown
  name: string
  description: string
  tickets: string
  tickets_available: boolean
  website: string
  imagepath: string
  body_markdown: string
  venue: string
  doors: string
  music: string
  price_standard: string
  price_unwaged: string
  price_members: string
  created_at: unknown
  updated_at: unknown
}

function readLocalGigs(): GigsState {
  const file = gigsFile()
  try {
    if (!fs.existsSync(file)) {
      const seeded = buildSeedGigsState()
      writeLocalGigs(seeded)
      return seeded
    }
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = coerceGigsState(JSON.parse(raw))
    if (parsed.gigs.length === 0) {
      const seeded = buildSeedGigsState()
      writeLocalGigs(seeded)
      return seeded
    }
    return parsed
  } catch {
    const seeded = buildSeedGigsState()
    try {
      writeLocalGigs(seeded)
    } catch {
      // The caller still receives the season list if the file cannot be written.
    }
    return seeded
  }
}

function writeLocalGigs(state: GigsState) {
  const file = gigsFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8')
}

async function imagesBlobStore() {
  return getStore({ name: GIG_IMAGES_BLOB_STORE, consistency: 'eventual' })
}

async function getDb() {
  return getDatabaseClient()
}

async function gigsBlobStore() {
  return getStore({ name: GIGS_BLOB_STORE, consistency: 'eventual' })
}

async function readBlobGigs(seedIfEmpty: boolean): Promise<GigsState> {
  try {
    const store = await gigsBlobStore()
    const value = await store.get(GIGS_LIST_KEY, { type: 'json' })
    const parsed = coerceGigsState(value)
    if (parsed.gigs.length === 0 && seedIfEmpty) {
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

/** Admin source of truth. Opens the database when it is connected. */
async function readAdminGigs(): Promise<GigsState> {
  if (shouldUseLocalStore()) return readLocalGigs()
  if (await databaseIsConfigured()) return readDatabaseGigs()
  return readBlobGigs(true)
}

function priceOrEmpty(value: string | undefined): string {
  return (value ?? '').trim()
}

function rowToGig(row: DbGigRow): Gig {
  const standard = row.price_standard.trim()
  const unwaged = row.price_unwaged.trim()
  const members = row.price_members.trim()
  return {
    id: row.id,
    date: asIsoDate(row.gig_date) ?? '1970-01-01',
    name: row.name,
    description: row.description,
    tickets: row.tickets,
    ticketsAvailable: Boolean(row.tickets_available),
    website: row.website,
    imagepath: row.imagepath,
    bodyMarkdown: row.body_markdown,
    venue: row.venue,
    doors: row.doors,
    music: row.music,
    ticketPrices: {
      standard: standard || undefined,
      unwaged: unwaged || undefined,
      members: members || undefined,
    },
    createdAt: asIsoTimestamp(row.created_at),
    updatedAt: asIsoTimestamp(row.updated_at),
  }
}

function rowsToState(rows: DbGigRow[]): GigsState {
  const gigs = sortGigsChronological(rows.map(rowToGig))
  const updatedAt = gigs.reduce(
    (latest, gig) => (gig.updatedAt > latest ? gig.updatedAt : latest),
    gigs[0]?.updatedAt ?? new Date().toISOString(),
  )
  return { gigs, updatedAt }
}

async function seedDatabaseGigs(): Promise<void> {
  const db = await getDb()
  const fromBlob = await readBlobGigs(false)
  const seed = fromBlob.gigs.length > 0 ? fromBlob : buildSeedGigsState()
  for (const gig of seed.gigs) {
    await db.sql`
      INSERT INTO gigs (
        id, gig_date, name, description, tickets, tickets_available, website, imagepath,
        body_markdown, venue, doors, music, price_standard, price_unwaged, price_members,
        created_at, updated_at
      )
      VALUES (
        ${gig.id},
        ${gig.date},
        ${gig.name},
        ${gig.description},
        ${gig.tickets},
        ${gig.ticketsAvailable},
        ${gig.website},
        ${gig.imagepath},
        ${gig.bodyMarkdown},
        ${gig.venue},
        ${gig.doors},
        ${gig.music},
        ${priceOrEmpty(gig.ticketPrices.standard)},
        ${priceOrEmpty(gig.ticketPrices.unwaged)},
        ${priceOrEmpty(gig.ticketPrices.members)},
        ${gig.createdAt},
        ${gig.updatedAt}
      )
      ON CONFLICT (gig_date) DO NOTHING
    `
  }
}

async function selectGigs(): Promise<DbGigRow[]> {
  const db = await getDb()
  return db.sql<DbGigRow>`
    SELECT
      id, gig_date, name, description, tickets, tickets_available, website, imagepath,
      body_markdown, venue, doors, music, price_standard, price_unwaged, price_members,
      created_at, updated_at
    FROM gigs
    ORDER BY gig_date ASC
  `
}

async function readDatabaseGigs(): Promise<GigsState> {
  let rows = await selectGigs()
  if (rows.length === 0) {
    await seedDatabaseGigs()
    rows = await selectGigs()
  }
  return rowsToState(rows)
}

async function insertGig(gig: Gig): Promise<void> {
  const db = await getDb()
  await db.sql`
    INSERT INTO gigs (
      id, gig_date, name, description, tickets, tickets_available, website, imagepath,
      body_markdown, venue, doors, music, price_standard, price_unwaged, price_members,
      created_at, updated_at
    )
    VALUES (
      ${gig.id},
      ${gig.date},
      ${gig.name},
      ${gig.description},
      ${gig.tickets},
      ${gig.ticketsAvailable},
      ${gig.website},
      ${gig.imagepath},
      ${gig.bodyMarkdown},
      ${gig.venue},
      ${gig.doors},
      ${gig.music},
      ${priceOrEmpty(gig.ticketPrices.standard)},
      ${priceOrEmpty(gig.ticketPrices.unwaged)},
      ${priceOrEmpty(gig.ticketPrices.members)},
      ${gig.createdAt},
      ${gig.updatedAt}
    )
  `
}

async function updateGigRow(gig: Gig): Promise<void> {
  const db = await getDb()
  const rows = await db.sql<{ id: string }>`
    UPDATE gigs
    SET
      gig_date = ${gig.date},
      name = ${gig.name},
      description = ${gig.description},
      tickets = ${gig.tickets},
      tickets_available = ${gig.ticketsAvailable},
      website = ${gig.website},
      imagepath = ${gig.imagepath},
      body_markdown = ${gig.bodyMarkdown},
      venue = ${gig.venue},
      doors = ${gig.doors},
      music = ${gig.music},
      price_standard = ${priceOrEmpty(gig.ticketPrices.standard)},
      price_unwaged = ${priceOrEmpty(gig.ticketPrices.unwaged)},
      price_members = ${priceOrEmpty(gig.ticketPrices.members)},
      updated_at = ${gig.updatedAt}
    WHERE id = ${gig.id}
    RETURNING id
  `
  if (!rows[0]) throw new Error('Gig not found')
}

async function deleteGigRow(id: string): Promise<void> {
  const db = await getDb()
  const rows = await db.sql<{ id: string }>`
    DELETE FROM gigs WHERE id = ${id} RETURNING id
  `
  if (!rows[0]) throw new Error('Gig not found')
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
  const dir = imagesDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, key), buffer)
  fs.writeFileSync(
    path.join(dir, `${key}.meta.json`),
    JSON.stringify({ contentType }, null, 2),
    'utf8',
  )
}

function readLocalImage(key: string): { buffer: Buffer; contentType: string } | null {
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

async function persistAdminGigs(state: GigsState, writeRow: () => Promise<void>): Promise<void> {
  if (shouldUseLocalStore()) {
    writeLocalGigs(state)
    return
  }
  if (await databaseIsConfigured()) await writeRow()
  await writeBlobGigs(state)
}

export const gigStore = {
  /** Public listing. Blobs only — never opens the database. */
  async listPublished(): Promise<GigsState> {
    if (shouldUseLocalStore()) return readLocalGigs()
    return readBlobGigs(false)
  },

  /** Admin listing. Reads the database when connected and republishes the blob. */
  async list(): Promise<GigsState> {
    if (shouldUseLocalStore()) return readLocalGigs()
    if (await databaseIsConfigured()) {
      const state = await readDatabaseGigs()
      await writeBlobGigs(state)
      return state
    }
    return readBlobGigs(true)
  },

  async getById(id: string): Promise<Gig | null> {
    const state = await readAdminGigs()
    return state.gigs.find((g) => g.id === id) ?? null
  },

  async create(input: GigInput): Promise<Gig> {
    const state = await readAdminGigs()
    if (state.gigs.some((g) => g.date === input.date.trim())) {
      throw new Error('A gig already exists on this date')
    }
    const gig = normalizeGig(input)
    const next: GigsState = {
      gigs: sortGigsChronological([...state.gigs, gig]),
      updatedAt: new Date().toISOString(),
    }
    await persistAdminGigs(next, () => insertGig(gig))
    return gig
  },

  async update(id: string, input: GigInput): Promise<Gig> {
    const state = await readAdminGigs()
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
    await persistAdminGigs(next, () => updateGigRow(gig))

    const prevKey = imageKeyFromPath(previous.imagepath)
    const nextKey = imageKeyFromPath(gig.imagepath)
    if (prevKey && prevKey !== nextKey) {
      await this.deleteImage(prevKey)
    }
    return gig
  },

  async remove(id: string): Promise<void> {
    const state = await readAdminGigs()
    const gig = state.gigs.find((g) => g.id === id)
    if (!gig) throw new Error('Gig not found')
    const next: GigsState = {
      gigs: state.gigs.filter((g) => g.id !== id),
      updatedAt: new Date().toISOString(),
    }
    await persistAdminGigs(next, () => deleteGigRow(id))
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
