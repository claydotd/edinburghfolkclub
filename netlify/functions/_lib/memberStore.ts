import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getStore } from '@netlify/blobs'
import {
  asIsoDate,
  asIsoTimestamp,
  normalizeEmail,
  normalizeMemberInput,
  toMember,
  type Member,
  type MemberInput,
  type MemberRecord,
} from './memberTypes.ts'
import { databaseIsConfigured, getDatabaseClient } from './database.ts'
import { localDataDir, shouldUseLocalStore } from './localDataDir.ts'

const MEMBERS_BLOB_STORE = 'members'
const MEMBERS_LIST_KEY = 'list'

function dataFilePath(): string {
  return path.join(localDataDir(), 'members-local.json')
}

type DbMemberRow = {
  id: string
  name: string
  email: string
  paid: boolean
  paid_at: unknown
  created_at: unknown
  updated_at: unknown
}

function readLocal(): MemberRecord[] {
  try {
    if (!fs.existsSync(dataFilePath())) return []
    const parsed = JSON.parse(fs.readFileSync(dataFilePath(), 'utf8')) as {
      members?: MemberRecord[]
    }
    return Array.isArray(parsed.members) ? parsed.members : []
  } catch {
    return []
  }
}

function writeLocal(members: MemberRecord[]) {
  const file = dataFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ members }, null, 2), 'utf8')
}

function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
  )
}

function rowToRecord(row: DbMemberRow): MemberRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    paid: Boolean(row.paid),
    paidAt: asIsoDate(row.paid_at),
    createdAt: asIsoTimestamp(row.created_at),
    updatedAt: asIsoTimestamp(row.updated_at),
  }
}

async function getDb() {
  return getDatabaseClient()
}

function coerceMemberRecord(value: unknown): MemberRecord | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  if (typeof raw.name !== 'string') return null
  if (typeof raw.email !== 'string' || !raw.email.trim()) return null
  return {
    id: raw.id,
    name: raw.name,
    email: normalizeEmail(raw.email),
    paid: Boolean(raw.paid),
    paidAt: typeof raw.paidAt === 'string' && raw.paidAt ? raw.paidAt : null,
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
  }
}

function coerceMemberRecords(value: unknown): MemberRecord[] {
  if (!value || typeof value !== 'object') return []
  const members = (value as { members?: unknown }).members
  if (!Array.isArray(members)) return []
  return members.flatMap((item) => {
    const record = coerceMemberRecord(item)
    return record ? [record] : []
  })
}

async function membersBlobStore() {
  return getStore({ name: MEMBERS_BLOB_STORE, consistency: 'eventual' })
}

/** Public snapshot. Never opens the database. */
async function readBlobMembers(): Promise<MemberRecord[]> {
  try {
    const store = await membersBlobStore()
    const value = await store.get(MEMBERS_LIST_KEY, { type: 'json' })
    return coerceMemberRecords(value)
  } catch {
    return []
  }
}

async function writeBlobMembers(members: MemberRecord[]): Promise<void> {
  const store = await membersBlobStore()
  await store.setJSON(MEMBERS_LIST_KEY, { members })
}

async function selectMembers(): Promise<MemberRecord[]> {
  const db = await getDb()
  const rows = await db.sql<DbMemberRow>`
    SELECT id, name, email, paid, paid_at, created_at, updated_at
    FROM members
    ORDER BY name ASC
  `
  return rows.map(rowToRecord)
}

async function republishMembers(): Promise<void> {
  if (shouldUseLocalStore()) return
  await writeBlobMembers(await selectMembers())
}

function publishedFromLocal(match: (record: MemberRecord) => boolean): Member | null {
  const record = readLocal().find(match)
  return record ? toMember(record) : null
}

function assertUniqueEmail(members: MemberRecord[], email: string, exceptId?: string) {
  const taken = members.some(
    (member) => member.email === email && member.id !== exceptId,
  )
  if (taken) throw new Error('A member with that email already exists')
}

export const memberStore = {
  /** Sign-in lookup. Blobs only — never opens the database. */
  async getPublishedByEmail(email: string): Promise<Member | null> {
    const normalised = normalizeEmail(email)
    if (!normalised) return null
    if (shouldUseLocalStore()) {
      return publishedFromLocal((member) => member.email === normalised)
    }
    const record = (await readBlobMembers()).find((member) => member.email === normalised)
    return record ? toMember(record) : null
  },

  /** Session lookup. Blobs only — never opens the database. */
  async getPublishedById(id: string): Promise<Member | null> {
    if (shouldUseLocalStore()) {
      return publishedFromLocal((member) => member.id === id)
    }
    const record = (await readBlobMembers()).find((member) => member.id === id)
    return record ? toMember(record) : null
  },

  /** Admin listing. Reads the database and republishes the blob. */
  async list(): Promise<Member[]> {
    if (shouldUseLocalStore()) {
      return sortMembers(readLocal().map(toMember))
    }
    if (!(await databaseIsConfigured())) {
      return sortMembers((await readBlobMembers()).map(toMember))
    }
    const records = await selectMembers()
    await writeBlobMembers(records)
    return sortMembers(records.map(toMember))
  },

  async getById(id: string): Promise<Member | null> {
    if (shouldUseLocalStore()) {
      const record = readLocal().find((member) => member.id === id)
      return record ? toMember(record) : null
    }
    if (!(await databaseIsConfigured())) return this.getPublishedById(id)
    const db = await getDb()
    const rows = await db.sql<DbMemberRow>`
      SELECT id, name, email, paid, paid_at, created_at, updated_at
      FROM members
      WHERE id = ${id}
      LIMIT 1
    `
    return rows[0] ? toMember(rowToRecord(rows[0])) : null
  },

  async getByEmail(email: string): Promise<Member | null> {
    const normalised = email.trim().toLowerCase()
    if (!normalised) return null
    if (shouldUseLocalStore()) {
      const record = readLocal().find((member) => member.email === normalised)
      return record ? toMember(record) : null
    }
    if (!(await databaseIsConfigured())) return this.getPublishedByEmail(normalised)
    const db = await getDb()
    const rows = await db.sql<DbMemberRow>`
      SELECT id, name, email, paid, paid_at, created_at, updated_at
      FROM members
      WHERE email = ${normalised}
      LIMIT 1
    `
    return rows[0] ? toMember(rowToRecord(rows[0])) : null
  },

  async create(input: MemberInput): Promise<Member> {
    const fields = normalizeMemberInput(input)
    if (shouldUseLocalStore()) {
      const members = readLocal()
      assertUniqueEmail(members, fields.email)
      const now = new Date().toISOString()
      const record: MemberRecord = {
        id: randomUUID(),
        ...fields,
        createdAt: now,
        updatedAt: now,
      }
      members.push(record)
      writeLocal(members)
      return toMember(record)
    }

    if (!(await databaseIsConfigured())) {
      const members = await readBlobMembers()
      assertUniqueEmail(members, fields.email)
      const now = new Date().toISOString()
      const record: MemberRecord = {
        id: randomUUID(),
        ...fields,
        createdAt: now,
        updatedAt: now,
      }
      members.push(record)
      await writeBlobMembers(members)
      return toMember(record)
    }

    const existing = await this.getByEmail(fields.email)
    if (existing) throw new Error('A member with that email already exists')

    const db = await getDb()
    const rows = await db.sql<DbMemberRow>`
      INSERT INTO members (name, email, paid, paid_at)
      VALUES (${fields.name}, ${fields.email}, ${fields.paid}, ${fields.paidAt})
      RETURNING id, name, email, paid, paid_at, created_at, updated_at
    `
    await republishMembers()
    return toMember(rowToRecord(rows[0]))
  },

  async update(id: string, input: MemberInput): Promise<Member> {
    const fields = normalizeMemberInput(input)
    if (shouldUseLocalStore()) {
      const members = readLocal()
      const index = members.findIndex((member) => member.id === id)
      if (index < 0) throw new Error('Member not found')
      assertUniqueEmail(members, fields.email, id)
      const record: MemberRecord = {
        ...members[index],
        ...fields,
        updatedAt: new Date().toISOString(),
      }
      members[index] = record
      writeLocal(members)
      return toMember(record)
    }

    if (!(await databaseIsConfigured())) {
      const members = await readBlobMembers()
      const index = members.findIndex((member) => member.id === id)
      if (index < 0) throw new Error('Member not found')
      assertUniqueEmail(members, fields.email, id)
      const record: MemberRecord = {
        ...members[index],
        ...fields,
        updatedAt: new Date().toISOString(),
      }
      members[index] = record
      await writeBlobMembers(members)
      return toMember(record)
    }

    const existing = await this.getById(id)
    if (!existing) throw new Error('Member not found')
    const emailOwner = await this.getByEmail(fields.email)
    if (emailOwner && emailOwner.id !== id) {
      throw new Error('A member with that email already exists')
    }

    const db = await getDb()
    const rows = await db.sql<DbMemberRow>`
      UPDATE members
      SET
        name = ${fields.name},
        email = ${fields.email},
        paid = ${fields.paid},
        paid_at = ${fields.paidAt},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, email, paid, paid_at, created_at, updated_at
    `
    if (!rows[0]) throw new Error('Member not found')
    await republishMembers()
    return toMember(rowToRecord(rows[0]))
  },

  async remove(id: string): Promise<void> {
    if (shouldUseLocalStore()) {
      const members = readLocal()
      const next = members.filter((member) => member.id !== id)
      if (next.length === members.length) throw new Error('Member not found')
      writeLocal(next)
      return
    }
    if (!(await databaseIsConfigured())) {
      const members = await readBlobMembers()
      const next = members.filter((member) => member.id !== id)
      if (next.length === members.length) throw new Error('Member not found')
      await writeBlobMembers(next)
      return
    }
    const db = await getDb()
    const rows = await db.sql<{ id: string }>`
      DELETE FROM members WHERE id = ${id} RETURNING id
    `
    if (!rows[0]) throw new Error('Member not found')
    await republishMembers()
  },
}
