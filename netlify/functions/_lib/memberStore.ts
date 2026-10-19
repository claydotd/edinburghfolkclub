import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  asIsoDate,
  asIsoTimestamp,
  normalizeMemberInput,
  toMember,
  type Member,
  type MemberInput,
  type MemberRecord,
} from './memberTypes.ts'
import { localDataDir } from './localDataDir.ts'

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

function shouldUseLocalStore(): boolean {
  return process.env.NEWS_USE_LOCAL === '1' || !process.env.NETLIFY
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
  const { getDatabase } = await import('@netlify/database')
  return getDatabase()
}

function assertUniqueEmail(members: MemberRecord[], email: string, exceptId?: string) {
  const taken = members.some(
    (member) => member.email === email && member.id !== exceptId,
  )
  if (taken) throw new Error('A member with that email already exists')
}

export const memberStore = {
  async list(): Promise<Member[]> {
    if (shouldUseLocalStore()) {
      return sortMembers(readLocal().map(toMember))
    }
    const db = await getDb()
    const rows = await db.sql<DbMemberRow>`
      SELECT id, name, email, paid, paid_at, created_at, updated_at
      FROM members
      ORDER BY name ASC
    `
    return rows.map((row) => toMember(rowToRecord(row)))
  },

  async getById(id: string): Promise<Member | null> {
    if (shouldUseLocalStore()) {
      const record = readLocal().find((member) => member.id === id)
      return record ? toMember(record) : null
    }
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

    const existing = await this.getByEmail(fields.email)
    if (existing) throw new Error('A member with that email already exists')

    const db = await getDb()
    const rows = await db.sql<DbMemberRow>`
      INSERT INTO members (name, email, paid, paid_at)
      VALUES (${fields.name}, ${fields.email}, ${fields.paid}, ${fields.paidAt})
      RETURNING id, name, email, paid, paid_at, created_at, updated_at
    `
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
    const db = await getDb()
    const rows = await db.sql<{ id: string }>`
      DELETE FROM members WHERE id = ${id} RETURNING id
    `
    if (!rows[0]) throw new Error('Member not found')
  },
}
