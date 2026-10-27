import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getStore } from '@netlify/blobs'
import { databaseIsConfigured, getDatabaseClient } from './database.ts'
import { localDataDir, shouldUseLocalStore } from './localDataDir.ts'
import {
  asIsoTimestamp,
  asNullableIsoTimestamp,
  normalizeEmail,
  type NewsletterSubscriber,
  type NewsletterSubscriberInput,
} from './newsletterTypes.ts'

const NEWSLETTER_BLOB_STORE = 'newsletter'
const NEWSLETTER_LIST_KEY = 'list'

function dataFilePath(): string {
  return path.join(localDataDir(), 'newsletter-local.json')
}

type DbSubscriberRow = {
  id: string
  email: string
  consented_at: unknown
  unsubscribed_at: unknown
  source: string
  created_at: unknown
  updated_at: unknown
}

function readLocal(): NewsletterSubscriber[] {
  try {
    if (!fs.existsSync(dataFilePath())) return []
    const parsed = JSON.parse(fs.readFileSync(dataFilePath(), 'utf8')) as {
      subscribers?: NewsletterSubscriber[]
    }
    return Array.isArray(parsed.subscribers) ? parsed.subscribers : []
  } catch {
    return []
  }
}

function writeLocal(subscribers: NewsletterSubscriber[]) {
  const file = dataFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ subscribers }, null, 2), 'utf8')
}

function sortSubscribers(
  subscribers: NewsletterSubscriber[],
): NewsletterSubscriber[] {
  return [...subscribers].sort((a, b) =>
    a.email.localeCompare(b.email, 'en', { sensitivity: 'base' }),
  )
}

function rowToSubscriber(row: DbSubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    consentedAt: asIsoTimestamp(row.consented_at),
    unsubscribedAt: asNullableIsoTimestamp(row.unsubscribed_at),
    source: row.source || 'signup',
    createdAt: asIsoTimestamp(row.created_at),
    updatedAt: asIsoTimestamp(row.updated_at),
  }
}

function coerceSubscriber(value: unknown): NewsletterSubscriber | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  if (typeof raw.email !== 'string' || !raw.email.trim()) return null
  return {
    id: raw.id,
    email: normalizeEmail(raw.email),
    consentedAt:
      typeof raw.consentedAt === 'string'
        ? raw.consentedAt
        : new Date(0).toISOString(),
    unsubscribedAt:
      typeof raw.unsubscribedAt === 'string' && raw.unsubscribedAt
        ? raw.unsubscribedAt
        : null,
    source: typeof raw.source === 'string' && raw.source ? raw.source : 'signup',
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
  }
}

function coerceSubscribers(value: unknown): NewsletterSubscriber[] {
  if (!value || typeof value !== 'object') return []
  const subscribers = (value as { subscribers?: unknown }).subscribers
  if (!Array.isArray(subscribers)) return []
  return subscribers.flatMap((item) => {
    const record = coerceSubscriber(item)
    return record ? [record] : []
  })
}

async function getDb() {
  return getDatabaseClient()
}

async function newsletterBlobStore() {
  return getStore({ name: NEWSLETTER_BLOB_STORE, consistency: 'eventual' })
}

async function readBlobSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const store = await newsletterBlobStore()
    const value = await store.get(NEWSLETTER_LIST_KEY, { type: 'json' })
    return coerceSubscribers(value)
  } catch {
    return []
  }
}

async function writeBlobSubscribers(
  subscribers: NewsletterSubscriber[],
): Promise<void> {
  const store = await newsletterBlobStore()
  await store.setJSON(NEWSLETTER_LIST_KEY, { subscribers })
}

async function selectSubscribers(): Promise<NewsletterSubscriber[]> {
  const db = await getDb()
  const rows = await db.sql<DbSubscriberRow>`
    SELECT id, email, consented_at, unsubscribed_at, source, created_at, updated_at
    FROM newsletter_subscribers
    ORDER BY email ASC
  `
  return rows.map(rowToSubscriber)
}

async function republishSubscribers(): Promise<void> {
  if (shouldUseLocalStore()) return
  await writeBlobSubscribers(await selectSubscribers())
}

function isActive(subscriber: NewsletterSubscriber): boolean {
  return !subscriber.unsubscribedAt
}

export const newsletterStore = {
  async list(): Promise<NewsletterSubscriber[]> {
    if (shouldUseLocalStore()) {
      return sortSubscribers(readLocal())
    }
    if (!(await databaseIsConfigured())) {
      return sortSubscribers(await readBlobSubscribers())
    }
    const records = await selectSubscribers()
    await writeBlobSubscribers(records)
    return sortSubscribers(records)
  },

  async listActive(): Promise<NewsletterSubscriber[]> {
    return (await this.list()).filter(isActive)
  },

  async getById(id: string): Promise<NewsletterSubscriber | null> {
    if (shouldUseLocalStore()) {
      return readLocal().find((subscriber) => subscriber.id === id) ?? null
    }
    if (!(await databaseIsConfigured())) {
      return (
        (await readBlobSubscribers()).find((subscriber) => subscriber.id === id) ??
        null
      )
    }
    const db = await getDb()
    const rows = await db.sql<DbSubscriberRow>`
      SELECT id, email, consented_at, unsubscribed_at, source, created_at, updated_at
      FROM newsletter_subscribers
      WHERE id = ${id}
      LIMIT 1
    `
    return rows[0] ? rowToSubscriber(rows[0]) : null
  },

  async getByEmail(email: string): Promise<NewsletterSubscriber | null> {
    const normalised = normalizeEmail(email)
    if (!normalised) return null
    if (shouldUseLocalStore()) {
      return readLocal().find((subscriber) => subscriber.email === normalised) ?? null
    }
    if (!(await databaseIsConfigured())) {
      return (
        (await readBlobSubscribers()).find(
          (subscriber) => subscriber.email === normalised,
        ) ?? null
      )
    }
    const db = await getDb()
    const rows = await db.sql<DbSubscriberRow>`
      SELECT id, email, consented_at, unsubscribed_at, source, created_at, updated_at
      FROM newsletter_subscribers
      WHERE email = ${normalised}
      LIMIT 1
    `
    return rows[0] ? rowToSubscriber(rows[0]) : null
  },

  /** Public signup. Re-activates an unsubscribed address. */
  async subscribe(input: NewsletterSubscriberInput): Promise<NewsletterSubscriber> {
    const email = normalizeEmail(input.email)
    const source = (input.source ?? 'signup').trim() || 'signup'
    const now = new Date().toISOString()
    const existing = await this.getByEmail(email)

    if (existing) {
      if (!existing.unsubscribedAt) return existing
      return this.reactivate(existing.id, source)
    }

    if (shouldUseLocalStore()) {
      const subscribers = readLocal()
      const record: NewsletterSubscriber = {
        id: randomUUID(),
        email,
        consentedAt: now,
        unsubscribedAt: null,
        source,
        createdAt: now,
        updatedAt: now,
      }
      subscribers.push(record)
      writeLocal(subscribers)
      return record
    }

    if (!(await databaseIsConfigured())) {
      const subscribers = await readBlobSubscribers()
      const record: NewsletterSubscriber = {
        id: randomUUID(),
        email,
        consentedAt: now,
        unsubscribedAt: null,
        source,
        createdAt: now,
        updatedAt: now,
      }
      subscribers.push(record)
      await writeBlobSubscribers(subscribers)
      return record
    }

    const db = await getDb()
    const rows = await db.sql<DbSubscriberRow>`
      INSERT INTO newsletter_subscribers (email, consented_at, source)
      VALUES (${email}, ${now}, ${source})
      RETURNING id, email, consented_at, unsubscribed_at, source, created_at, updated_at
    `
    await republishSubscribers()
    return rowToSubscriber(rows[0])
  },

  async create(input: NewsletterSubscriberInput): Promise<NewsletterSubscriber> {
    const email = normalizeEmail(input.email)
    const existing = await this.getByEmail(email)
    if (existing && !existing.unsubscribedAt) {
      throw new Error('That email is already subscribed')
    }
    if (existing?.unsubscribedAt) {
      return this.reactivate(existing.id, input.source ?? 'admin')
    }
    return this.subscribe({ email, source: input.source ?? 'admin' })
  },

  /**
   * Bulk add from admin CSV import. Skips already-active addresses,
   * reactivates unsubscribed ones, and writes local/blob stores once.
   */
  async importMany(
    emails: string[],
    source = 'csv-import',
  ): Promise<{
    added: number
    reactivated: number
    skipped: number
  }> {
    const unique = [
      ...new Set(
        emails
          .map((email) => normalizeEmail(email))
          .filter((email) => email.length > 0),
      ),
    ]
    let added = 0
    let reactivated = 0
    let skipped = 0
    const now = new Date().toISOString()
    const importSource = source.trim() || 'csv-import'

    if (shouldUseLocalStore()) {
      const subscribers = readLocal()
      const byEmail = new Map(
        subscribers.map((subscriber) => [subscriber.email, subscriber] as const),
      )
      for (const email of unique) {
        const existing = byEmail.get(email)
        if (existing && !existing.unsubscribedAt) {
          skipped += 1
          continue
        }
        if (existing?.unsubscribedAt) {
          const record: NewsletterSubscriber = {
            ...existing,
            consentedAt: now,
            unsubscribedAt: null,
            source: importSource,
            updatedAt: now,
          }
          const index = subscribers.findIndex((item) => item.id === existing.id)
          subscribers[index] = record
          byEmail.set(email, record)
          reactivated += 1
          continue
        }
        const record: NewsletterSubscriber = {
          id: randomUUID(),
          email,
          consentedAt: now,
          unsubscribedAt: null,
          source: importSource,
          createdAt: now,
          updatedAt: now,
        }
        subscribers.push(record)
        byEmail.set(email, record)
        added += 1
      }
      writeLocal(subscribers)
      return { added, reactivated, skipped }
    }

    if (!(await databaseIsConfigured())) {
      const subscribers = await readBlobSubscribers()
      const byEmail = new Map(
        subscribers.map((subscriber) => [subscriber.email, subscriber] as const),
      )
      for (const email of unique) {
        const existing = byEmail.get(email)
        if (existing && !existing.unsubscribedAt) {
          skipped += 1
          continue
        }
        if (existing?.unsubscribedAt) {
          const record: NewsletterSubscriber = {
            ...existing,
            consentedAt: now,
            unsubscribedAt: null,
            source: importSource,
            updatedAt: now,
          }
          const index = subscribers.findIndex((item) => item.id === existing.id)
          subscribers[index] = record
          byEmail.set(email, record)
          reactivated += 1
          continue
        }
        const record: NewsletterSubscriber = {
          id: randomUUID(),
          email,
          consentedAt: now,
          unsubscribedAt: null,
          source: importSource,
          createdAt: now,
          updatedAt: now,
        }
        subscribers.push(record)
        byEmail.set(email, record)
        added += 1
      }
      await writeBlobSubscribers(subscribers)
      return { added, reactivated, skipped }
    }

    const existingList = await selectSubscribers()
    const byEmail = new Map(
      existingList.map((subscriber) => [subscriber.email, subscriber] as const),
    )
    const db = await getDb()
    for (const email of unique) {
      const existing = byEmail.get(email)
      if (existing && !existing.unsubscribedAt) {
        skipped += 1
        continue
      }
      if (existing?.unsubscribedAt) {
        const rows = await db.sql<DbSubscriberRow>`
          UPDATE newsletter_subscribers
          SET
            consented_at = ${now},
            unsubscribed_at = NULL,
            source = ${importSource},
            updated_at = NOW()
          WHERE id = ${existing.id}
          RETURNING id, email, consented_at, unsubscribed_at, source, created_at, updated_at
        `
        if (rows[0]) {
          byEmail.set(email, rowToSubscriber(rows[0]))
          reactivated += 1
        }
        continue
      }
      const rows = await db.sql<DbSubscriberRow>`
        INSERT INTO newsletter_subscribers (email, consented_at, source)
        VALUES (${email}, ${now}, ${importSource})
        RETURNING id, email, consented_at, unsubscribed_at, source, created_at, updated_at
      `
      if (rows[0]) {
        byEmail.set(email, rowToSubscriber(rows[0]))
        added += 1
      }
    }
    await republishSubscribers()
    return { added, reactivated, skipped }
  },

  async reactivate(
    id: string,
    source = 'signup',
  ): Promise<NewsletterSubscriber> {
    const now = new Date().toISOString()
    if (shouldUseLocalStore()) {
      const subscribers = readLocal()
      const index = subscribers.findIndex((subscriber) => subscriber.id === id)
      if (index < 0) throw new Error('Subscriber not found')
      const record: NewsletterSubscriber = {
        ...subscribers[index],
        consentedAt: now,
        unsubscribedAt: null,
        source,
        updatedAt: now,
      }
      subscribers[index] = record
      writeLocal(subscribers)
      return record
    }

    if (!(await databaseIsConfigured())) {
      const subscribers = await readBlobSubscribers()
      const index = subscribers.findIndex((subscriber) => subscriber.id === id)
      if (index < 0) throw new Error('Subscriber not found')
      const record: NewsletterSubscriber = {
        ...subscribers[index],
        consentedAt: now,
        unsubscribedAt: null,
        source,
        updatedAt: now,
      }
      subscribers[index] = record
      await writeBlobSubscribers(subscribers)
      return record
    }

    const db = await getDb()
    const rows = await db.sql<DbSubscriberRow>`
      UPDATE newsletter_subscribers
      SET
        consented_at = ${now},
        unsubscribed_at = NULL,
        source = ${source},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, consented_at, unsubscribed_at, source, created_at, updated_at
    `
    if (!rows[0]) throw new Error('Subscriber not found')
    await republishSubscribers()
    return rowToSubscriber(rows[0])
  },

  async unsubscribe(id: string): Promise<NewsletterSubscriber> {
    const now = new Date().toISOString()
    if (shouldUseLocalStore()) {
      const subscribers = readLocal()
      const index = subscribers.findIndex((subscriber) => subscriber.id === id)
      if (index < 0) throw new Error('Subscriber not found')
      if (subscribers[index].unsubscribedAt) return subscribers[index]
      const record: NewsletterSubscriber = {
        ...subscribers[index],
        unsubscribedAt: now,
        updatedAt: now,
      }
      subscribers[index] = record
      writeLocal(subscribers)
      return record
    }

    if (!(await databaseIsConfigured())) {
      const subscribers = await readBlobSubscribers()
      const index = subscribers.findIndex((subscriber) => subscriber.id === id)
      if (index < 0) throw new Error('Subscriber not found')
      if (subscribers[index].unsubscribedAt) return subscribers[index]
      const record: NewsletterSubscriber = {
        ...subscribers[index],
        unsubscribedAt: now,
        updatedAt: now,
      }
      subscribers[index] = record
      await writeBlobSubscribers(subscribers)
      return record
    }

    const db = await getDb()
    const rows = await db.sql<DbSubscriberRow>`
      UPDATE newsletter_subscribers
      SET unsubscribed_at = COALESCE(unsubscribed_at, ${now}), updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, consented_at, unsubscribed_at, source, created_at, updated_at
    `
    if (!rows[0]) throw new Error('Subscriber not found')
    await republishSubscribers()
    return rowToSubscriber(rows[0])
  },

  async remove(id: string): Promise<void> {
    if (shouldUseLocalStore()) {
      const subscribers = readLocal()
      const next = subscribers.filter((subscriber) => subscriber.id !== id)
      if (next.length === subscribers.length) throw new Error('Subscriber not found')
      writeLocal(next)
      return
    }
    if (!(await databaseIsConfigured())) {
      const subscribers = await readBlobSubscribers()
      const next = subscribers.filter((subscriber) => subscriber.id !== id)
      if (next.length === subscribers.length) throw new Error('Subscriber not found')
      await writeBlobSubscribers(next)
      return
    }
    const db = await getDb()
    const rows = await db.sql<{ id: string }>`
      DELETE FROM newsletter_subscribers WHERE id = ${id} RETURNING id
    `
    if (!rows[0]) throw new Error('Subscriber not found')
    await republishSubscribers()
  },
}
