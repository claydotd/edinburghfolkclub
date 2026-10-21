import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getStore } from '@netlify/blobs'
import { databaseIsConfigured, getDatabaseClient } from './database.ts'
import { localDataDir, shouldUseLocalStore } from './localDataDir.ts'
import { asIsoTimestamp } from './memberTypes.ts'

const RESERVATIONS_BLOB_STORE = 'reservations'
const RESERVATIONS_LIST_KEY = 'list'

export type ReservationRecord = {
  id: string
  memberId: string
  gigId: string
  createdAt: string
}

type DbReservationRow = {
  id: string
  member_id: string
  gig_id: string
  created_at: unknown
}

function dataFilePath(): string {
  return path.join(localDataDir(), 'reservations-local.json')
}

function rowToRecord(row: DbReservationRow): ReservationRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    gigId: row.gig_id,
    createdAt: asIsoTimestamp(row.created_at),
  }
}

function coerceRecord(value: unknown): ReservationRecord | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  if (typeof raw.memberId !== 'string' || !raw.memberId.trim()) return null
  if (typeof raw.gigId !== 'string' || !raw.gigId.trim()) return null
  return {
    id: raw.id,
    memberId: raw.memberId,
    gigId: raw.gigId,
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
  }
}

function readLocal(): ReservationRecord[] {
  try {
    if (!fs.existsSync(dataFilePath())) return []
    const parsed = JSON.parse(fs.readFileSync(dataFilePath(), 'utf8')) as {
      reservations?: unknown
    }
    if (!Array.isArray(parsed.reservations)) return []
    return parsed.reservations.flatMap((item) => {
      const record = coerceRecord(item)
      return record ? [record] : []
    })
  } catch {
    return []
  }
}

function writeLocal(reservations: ReservationRecord[]) {
  const file = dataFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ reservations }, null, 2), 'utf8')
}

async function reservationsBlobStore() {
  // Eventual consistency: this functions runtime has no uncached edge URL,
  // and a strong read throws.
  return getStore({ name: RESERVATIONS_BLOB_STORE, consistency: 'eventual' })
}

async function readBlob(): Promise<ReservationRecord[]> {
  try {
    const store = await reservationsBlobStore()
    const value = await store.get(RESERVATIONS_LIST_KEY, { type: 'json' })
    if (!value || typeof value !== 'object') return []
    const reservations = (value as { reservations?: unknown }).reservations
    if (!Array.isArray(reservations)) return []
    return reservations.flatMap((item) => {
      const record = coerceRecord(item)
      return record ? [record] : []
    })
  } catch {
    return []
  }
}

async function writeBlob(reservations: ReservationRecord[]): Promise<void> {
  const store = await reservationsBlobStore()
  await store.setJSON(RESERVATIONS_LIST_KEY, { reservations })
}

async function getDb() {
  return getDatabaseClient()
}

async function selectAll(): Promise<ReservationRecord[]> {
  const db = await getDb()
  const rows = await db.sql<DbReservationRow>`
    SELECT id, member_id, gig_id, created_at
    FROM gig_reservations
    ORDER BY created_at ASC
  `
  return rows.map(rowToRecord)
}

function uniqueIds(gigIds: string[]): string[] {
  return [...new Set(gigIds.map((id) => id.trim()).filter(Boolean))]
}

export const reservationStore = {
  async list(): Promise<ReservationRecord[]> {
    if (shouldUseLocalStore()) return readLocal()
    if (!(await databaseIsConfigured())) return readBlob()
    return selectAll()
  },

  async listByMember(memberId: string): Promise<ReservationRecord[]> {
    if (shouldUseLocalStore() || !(await databaseIsConfigured())) {
      return (await this.list()).filter((reservation) => reservation.memberId === memberId)
    }
    const db = await getDb()
    const rows = await db.sql<DbReservationRow>`
      SELECT id, member_id, gig_id, created_at
      FROM gig_reservations
      WHERE member_id = ${memberId}
      ORDER BY created_at ASC
    `
    return rows.map(rowToRecord)
  },

  /**
   * Inserts missing rows. An id this member already reserved is left as it is.
   * Returns this member's reservations, including the rows just written, so the
   * caller does not have to read the blob again.
   */
  async createMany(memberId: string, gigIds: string[]): Promise<ReservationRecord[]> {
    const existingRecords = await this.listByMember(memberId)
    const existing = new Set(existingRecords.map((reservation) => reservation.gigId))
    const toInsert = uniqueIds(gigIds).filter((gigId) => !existing.has(gigId))
    if (toInsert.length === 0) return existingRecords

    const now = new Date().toISOString()
    const added: ReservationRecord[] = toInsert.map((gigId) => ({
      id: randomUUID(),
      memberId,
      gigId,
      createdAt: now,
    }))

    if (shouldUseLocalStore()) {
      writeLocal([...readLocal(), ...added])
      return [...existingRecords, ...added]
    }

    if (!(await databaseIsConfigured())) {
      const reservations = await readBlob()
      await writeBlob([...reservations, ...added])
      return [...existingRecords, ...added]
    }

    const db = await getDb()
    for (const gigId of toInsert) {
      await db.sql`
        INSERT INTO gig_reservations (member_id, gig_id)
        VALUES (${memberId}, ${gigId})
        ON CONFLICT (member_id, gig_id) DO NOTHING
      `
    }
    return this.listByMember(memberId)
  },

  async removeOne(memberId: string, gigId: string): Promise<void> {
    const keep = (reservation: ReservationRecord) =>
      reservation.memberId !== memberId || reservation.gigId !== gigId

    if (shouldUseLocalStore()) {
      const current = readLocal()
      const next = current.filter(keep)
      if (next.length === current.length) throw new Error('Reservation not found')
      writeLocal(next)
      return
    }
    if (!(await databaseIsConfigured())) {
      const current = await readBlob()
      const next = current.filter(keep)
      if (next.length === current.length) throw new Error('Reservation not found')
      await writeBlob(next)
      return
    }
    const db = await getDb()
    const rows = await db.sql<{ id: string }>`
      DELETE FROM gig_reservations
      WHERE member_id = ${memberId} AND gig_id = ${gigId}
      RETURNING id
    `
    if (!rows[0]) throw new Error('Reservation not found')
  },

  async removeByMember(memberId: string): Promise<void> {
    if (shouldUseLocalStore()) {
      writeLocal(readLocal().filter((reservation) => reservation.memberId !== memberId))
      return
    }
    if (!(await databaseIsConfigured())) {
      const reservations = await readBlob()
      await writeBlob(
        reservations.filter((reservation) => reservation.memberId !== memberId),
      )
      return
    }
    const db = await getDb()
    await db.sql`
      DELETE FROM gig_reservations WHERE member_id = ${memberId}
    `
  },

  async removeByGig(gigId: string): Promise<void> {
    if (shouldUseLocalStore()) {
      writeLocal(readLocal().filter((reservation) => reservation.gigId !== gigId))
      return
    }
    if (!(await databaseIsConfigured())) {
      const reservations = await readBlob()
      await writeBlob(reservations.filter((reservation) => reservation.gigId !== gigId))
      return
    }
    const db = await getDb()
    await db.sql`
      DELETE FROM gig_reservations WHERE gig_id = ${gigId}
    `
  },
}
