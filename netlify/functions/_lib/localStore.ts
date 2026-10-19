import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type {
  HomeBannersInput,
  HomeBannersState,
  NewsPost,
  NewsPostInput,
  NewsSnapshot,
} from './types.ts'
import {
  coerceHomeBanners,
  emptyHomeBanners,
  normalizeHomeBanners,
  postToSnapshotPost,
} from './types.ts'
import { localDataDir } from './localDataDir.ts'

function dataFilePath(): string {
  return path.join(localDataDir(), 'news-local.json')
}

type LocalFile = {
  posts: NewsPost[]
  snapshot: NewsSnapshot
  banner: HomeBannersState
}

const seedPost: NewsPost = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'welcome-to-the-news',
  title: 'Lorem ipsum dolor sit amet',
  excerpt:
    'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  bodyMarkdown:
    '## Lorem ipsum\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  published: true,
  publishedAt: '2026-01-15T12:00:00.000Z',
  hidePublishedDate: false,
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
}

function emptySnapshot(): NewsSnapshot {
  return { updatedAt: new Date().toISOString(), posts: [] }
}

function buildSnapshot(posts: NewsPost[]): NewsSnapshot {
  const published = posts
    .filter((p) => p.published)
    .sort((a, b) => {
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0
      return bTime - aTime
    })
    .map(postToSnapshotPost)
  return { updatedAt: new Date().toISOString(), posts: published }
}

function readFile(): LocalFile {
  try {
    if (!fs.existsSync(dataFilePath())) {
      const posts = [seedPost]
      const initial: LocalFile = {
        posts,
        snapshot: buildSnapshot(posts),
        banner: emptyHomeBanners(),
      }
      writeFile(initial)
      return initial
    }
    const raw = fs.readFileSync(dataFilePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<LocalFile>
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      snapshot:
        parsed.snapshot && Array.isArray(parsed.snapshot.posts)
          ? parsed.snapshot
          : emptySnapshot(),
      banner: coerceHomeBanners(parsed.banner),
    }
  } catch {
    return { posts: [], snapshot: emptySnapshot(), banner: emptyHomeBanners() }
  }
}

function writeFile(data: LocalFile) {
  const file = dataFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function normalizeInput(input: NewsPostInput, existing?: NewsPost): NewsPost {
  const now = new Date().toISOString()
  const published = Boolean(input.published)
  let publishedAt = existing?.publishedAt ?? null
  if (published && !publishedAt) publishedAt = now
  if (!published) publishedAt = null

  return {
    id: existing?.id ?? randomUUID(),
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: (input.excerpt ?? '').trim(),
    bodyMarkdown: input.bodyMarkdown ?? '',
    published,
    publishedAt,
    hidePublishedDate: Boolean(input.hidePublishedDate),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export const localStore = {
  async getSnapshot(): Promise<NewsSnapshot> {
    return readFile().snapshot
  },

  async listAll(): Promise<NewsPost[]> {
    return [...readFile().posts].sort((a, b) => {
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    })
  },

  async getById(id: string): Promise<NewsPost | null> {
    return readFile().posts.find((p) => p.id === id) ?? null
  },

  async create(input: NewsPostInput): Promise<NewsPost> {
    const data = readFile()
    const post = normalizeInput(input)
    if (data.posts.some((p) => p.slug === post.slug)) {
      throw new Error('A post with this slug already exists')
    }
    data.posts.unshift(post)
    data.snapshot = buildSnapshot(data.posts)
    writeFile(data)
    return post
  },

  async update(id: string, input: NewsPostInput): Promise<NewsPost> {
    const data = readFile()
    const index = data.posts.findIndex((p) => p.id === id)
    if (index < 0) throw new Error('Post not found')
    const slugTaken = data.posts.some((p) => p.slug === input.slug.trim() && p.id !== id)
    if (slugTaken) throw new Error('A post with this slug already exists')
    const post = normalizeInput(input, data.posts[index])
    data.posts[index] = post
    data.snapshot = buildSnapshot(data.posts)
    writeFile(data)
    return post
  },

  async remove(id: string): Promise<void> {
    const data = readFile()
    const next = data.posts.filter((p) => p.id !== id)
    if (next.length === data.posts.length) throw new Error('Post not found')
    data.posts = next
    data.snapshot = buildSnapshot(data.posts)
    writeFile(data)
  },

  async rebuildSnapshot(): Promise<NewsSnapshot> {
    const data = readFile()
    data.snapshot = buildSnapshot(data.posts)
    writeFile(data)
    return data.snapshot
  },

  async getBanner(): Promise<HomeBannersState> {
    return readFile().banner
  },

  async setBanner(input: HomeBannersInput): Promise<HomeBannersState> {
    const data = readFile()
    const banner = normalizeHomeBanners(input, data.banner)
    data.banner = banner
    writeFile(data)
    return banner
  },
}
