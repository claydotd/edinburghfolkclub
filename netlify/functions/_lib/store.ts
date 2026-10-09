import { getStore } from '@netlify/blobs'
import type {
  HomeBanner,
  HomeBannerInput,
  NewsPost,
  NewsPostInput,
  NewsSnapshot,
} from './types.ts'
import {
  emptyHomeBanner,
  normalizeHomeBanner,
  postToSnapshotPost,
  rowToPost,
  type DbNewsRow,
} from './types.ts'
import { localStore } from './localStore.ts'

const BLOB_STORE = 'news'
const BLOB_KEY = 'published'
const BLOB_BANNER_KEY = 'home-banner'

function emptySnapshot(): NewsSnapshot {
  return { updatedAt: new Date().toISOString(), posts: [] }
}

function shouldUseLocalStore(): boolean {
  return process.env.NEWS_USE_LOCAL === '1' || !process.env.NETLIFY
}

async function getDb() {
  const { getDatabase } = await import('@netlify/database')
  return getDatabase()
}

async function blobStore() {
  return getStore({ name: BLOB_STORE, consistency: 'strong' })
}

async function rebuildSnapshotFromDb(): Promise<NewsSnapshot> {
  const db = await getDb()
  const rows = await db.sql<DbNewsRow>`
    SELECT id, slug, title, excerpt, body_markdown, published, published_at, created_at, updated_at
    FROM news_posts
    WHERE published = TRUE
    ORDER BY published_at DESC NULLS LAST
  `
  const posts = rows.map(rowToPost).map(postToSnapshotPost)
  const snapshot: NewsSnapshot = {
    updatedAt: new Date().toISOString(),
    posts,
  }
  const store = await blobStore()
  await store.setJSON(BLOB_KEY, snapshot)
  return snapshot
}

async function readBlobSnapshot(): Promise<NewsSnapshot> {
  try {
    const store = await blobStore()
    const snapshot = await store.get(BLOB_KEY, { type: 'json' })
    if (snapshot && typeof snapshot === 'object' && Array.isArray((snapshot as NewsSnapshot).posts)) {
      return snapshot as NewsSnapshot
    }
  } catch {
    // Fall through to empty / rebuild
  }
  return emptySnapshot()
}

export const newsStore = {
  async getPublicSnapshot(): Promise<NewsSnapshot> {
    if (shouldUseLocalStore()) return localStore.getSnapshot()
    return readBlobSnapshot()
  },

  async listAll(): Promise<NewsPost[]> {
    if (shouldUseLocalStore()) return localStore.listAll()
    const db = await getDb()
    const rows = await db.sql<DbNewsRow>`
      SELECT id, slug, title, excerpt, body_markdown, published, published_at, created_at, updated_at
      FROM news_posts
      ORDER BY updated_at DESC
    `
    return rows.map(rowToPost)
  },

  async getById(id: string): Promise<NewsPost | null> {
    if (shouldUseLocalStore()) return localStore.getById(id)
    const db = await getDb()
    const rows = await db.sql<DbNewsRow>`
      SELECT id, slug, title, excerpt, body_markdown, published, published_at, created_at, updated_at
      FROM news_posts
      WHERE id = ${id}
      LIMIT 1
    `
    return rows[0] ? rowToPost(rows[0]) : null
  },

  async create(input: NewsPostInput): Promise<NewsPost> {
    if (shouldUseLocalStore()) return localStore.create(input)
    const db = await getDb()
    const published = Boolean(input.published)
    const publishedAt = published ? new Date().toISOString() : null
    const rows = await db.sql<DbNewsRow>`
      INSERT INTO news_posts (slug, title, excerpt, body_markdown, published, published_at)
      VALUES (
        ${input.slug.trim()},
        ${input.title.trim()},
        ${(input.excerpt ?? '').trim()},
        ${input.bodyMarkdown ?? ''},
        ${published},
        ${publishedAt}
      )
      RETURNING id, slug, title, excerpt, body_markdown, published, published_at, created_at, updated_at
    `
    await rebuildSnapshotFromDb()
    return rowToPost(rows[0])
  },

  async update(id: string, input: NewsPostInput): Promise<NewsPost> {
    if (shouldUseLocalStore()) return localStore.update(id, input)
    const existing = await this.getById(id)
    if (!existing) throw new Error('Post not found')

    const published = Boolean(input.published)
    let publishedAt: string | null = existing.publishedAt
    if (published && !publishedAt) publishedAt = new Date().toISOString()
    if (!published) publishedAt = null

    const db = await getDb()
    const rows = await db.sql<DbNewsRow>`
      UPDATE news_posts
      SET
        slug = ${input.slug.trim()},
        title = ${input.title.trim()},
        excerpt = ${(input.excerpt ?? '').trim()},
        body_markdown = ${input.bodyMarkdown ?? ''},
        published = ${published},
        published_at = ${publishedAt},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, slug, title, excerpt, body_markdown, published, published_at, created_at, updated_at
    `
    if (!rows[0]) throw new Error('Post not found')
    await rebuildSnapshotFromDb()
    return rowToPost(rows[0])
  },

  async remove(id: string): Promise<void> {
    if (shouldUseLocalStore()) return localStore.remove(id)
    const db = await getDb()
    const rows = await db.sql<{ id: string }>`
      DELETE FROM news_posts WHERE id = ${id} RETURNING id
    `
    if (!rows[0]) throw new Error('Post not found')
    await rebuildSnapshotFromDb()
  },

  async getBanner(): Promise<HomeBanner> {
    if (shouldUseLocalStore()) return localStore.getBanner()
    try {
      const store = await blobStore()
      const banner = await store.get(BLOB_BANNER_KEY, { type: 'json' })
      if (banner && typeof banner === 'object') {
        const raw = banner as Partial<HomeBanner>
        return {
          enabled: Boolean(raw.enabled),
          text: typeof raw.text === 'string' ? raw.text : '',
          ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel : '',
          ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref : '',
          updatedAt:
            typeof raw.updatedAt === 'string'
              ? raw.updatedAt
              : new Date().toISOString(),
        }
      }
    } catch {
      // Fall through
    }
    return emptyHomeBanner()
  },

  async setBanner(input: HomeBannerInput): Promise<HomeBanner> {
    if (shouldUseLocalStore()) return localStore.setBanner(input)
    const existing = await this.getBanner()
    const banner = normalizeHomeBanner(input, existing)
    const store = await blobStore()
    await store.setJSON(BLOB_BANNER_KEY, banner)
    return banner
  },
}
