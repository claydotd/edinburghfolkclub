import { DEMO_ADMIN_PASSWORD, DEMO_SEED_BANNER, DEMO_SEED_POSTS } from './demoData'
import type {
  HomeBanner,
  HomeBannerInput,
  NewsPost,
  NewsPostInput,
  NewsSnapshot,
  NewsSnapshotPost,
} from './types'

const DATA_KEY = 'efc-news-demo'
const AUTH_KEY = 'efc-news-demo-auth'

type DemoFile = {
  posts: NewsPost[]
  banner: HomeBanner
}

function postToSnapshotPost(post: NewsPost): NewsSnapshotPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    publishedAt: post.publishedAt,
  }
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

function seedFile(): DemoFile {
  return {
    posts: DEMO_SEED_POSTS.map((p) => ({ ...p })),
    banner: { ...DEMO_SEED_BANNER },
  }
}

function readFile(): DemoFile {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) {
      const initial = seedFile()
      writeFile(initial)
      return initial
    }
    const parsed = JSON.parse(raw) as Partial<DemoFile>
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : seedFile().posts,
      banner:
        parsed.banner && typeof parsed.banner === 'object'
          ? {
              enabled: Boolean(parsed.banner.enabled),
              text: typeof parsed.banner.text === 'string' ? parsed.banner.text : '',
              ctaLabel:
                typeof parsed.banner.ctaLabel === 'string'
                  ? parsed.banner.ctaLabel
                  : '',
              ctaHref:
                typeof parsed.banner.ctaHref === 'string'
                  ? parsed.banner.ctaHref
                  : '',
              updatedAt:
                typeof parsed.banner.updatedAt === 'string'
                  ? parsed.banner.updatedAt
                  : new Date().toISOString(),
            }
          : { ...DEMO_SEED_BANNER },
    }
  } catch {
    return seedFile()
  }
}

function writeFile(data: DemoFile) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data))
}

function requireAuth() {
  if (!isAuthenticated()) {
    throw new Error('Unauthorized')
  }
}

function validateInput(input: NewsPostInput): void {
  if (!input.title?.trim()) throw new Error('Title is required')
  if (!input.slug?.trim()) throw new Error('Slug is required')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim())) {
    throw new Error('Slug must be lowercase letters, numbers, and hyphens')
  }
}

function validateBannerInput(input: HomeBannerInput): void {
  const enabled = Boolean(input.enabled)
  const text = (input.text ?? '').trim()
  const ctaLabel = (input.ctaLabel ?? '').trim()
  const ctaHref = (input.ctaHref ?? '').trim()

  if (enabled) {
    if (!text) throw new Error('Banner text is required when enabled')
    if (!ctaLabel) throw new Error('CTA label is required when enabled')
    if (!ctaHref) throw new Error('CTA link is required when enabled')
  }

  if (ctaHref) {
    const ok =
      ctaHref.startsWith('/') ||
      ctaHref.startsWith('https://') ||
      ctaHref.startsWith('http://') ||
      ctaHref.startsWith('mailto:')
    if (!ok) {
      throw new Error('CTA link must be a site path (/…), http(s) URL, or mailto:')
    }
  }
}

function normalizePost(input: NewsPostInput, existing?: NewsPost): NewsPost {
  const now = new Date().toISOString()
  const published = Boolean(input.published)
  return {
    id: existing?.id ?? crypto.randomUUID(),
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: (input.excerpt ?? '').trim(),
    bodyMarkdown: input.bodyMarkdown ?? '',
    published,
    publishedAt: published
      ? existing?.publishedAt && existing.published
        ? existing.publishedAt
        : now
      : null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), 40)
  })
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}

export async function login(password: string): Promise<void> {
  if (password !== DEMO_ADMIN_PASSWORD) {
    throw new Error('Invalid password')
  }
  sessionStorage.setItem(AUTH_KEY, '1')
  await delay(undefined)
}

export async function logout(): Promise<void> {
  sessionStorage.removeItem(AUTH_KEY)
  await delay(undefined)
}

export async function getSnapshot(): Promise<NewsSnapshot> {
  const data = readFile()
  return delay(buildSnapshot(data.posts))
}

export async function getPublishedPost(
  slug: string,
): Promise<{ post: NewsSnapshotPost; updatedAt: string }> {
  const snapshot = await getSnapshot()
  const post = snapshot.posts.find((p) => p.slug === slug)
  if (!post) throw new Error('Post not found')
  return { post, updatedAt: snapshot.updatedAt }
}

export async function getHomeBanner(): Promise<HomeBanner> {
  return delay(readFile().banner)
}

export async function listPosts(): Promise<NewsPost[]> {
  requireAuth()
  const posts = [...readFile().posts].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt)
    const bTime = Date.parse(b.updatedAt)
    return bTime - aTime
  })
  return delay(posts)
}

export async function getPost(id: string): Promise<NewsPost> {
  requireAuth()
  const post = readFile().posts.find((p) => p.id === id)
  if (!post) throw new Error('Post not found')
  return delay(post)
}

export async function createPost(input: NewsPostInput): Promise<NewsPost> {
  requireAuth()
  validateInput(input)
  const data = readFile()
  if (data.posts.some((p) => p.slug === input.slug.trim())) {
    throw new Error('Slug already in use')
  }
  const post = normalizePost(input)
  data.posts.unshift(post)
  writeFile(data)
  return delay(post)
}

export async function updatePost(
  id: string,
  input: NewsPostInput,
): Promise<NewsPost> {
  requireAuth()
  validateInput(input)
  const data = readFile()
  const index = data.posts.findIndex((p) => p.id === id)
  if (index < 0) throw new Error('Post not found')
  if (
    data.posts.some((p) => p.id !== id && p.slug === input.slug.trim())
  ) {
    throw new Error('Slug already in use')
  }
  const post = normalizePost(input, data.posts[index])
  data.posts[index] = post
  writeFile(data)
  return delay(post)
}

export async function deletePost(id: string): Promise<void> {
  requireAuth()
  const data = readFile()
  const next = data.posts.filter((p) => p.id !== id)
  if (next.length === data.posts.length) throw new Error('Post not found')
  data.posts = next
  writeFile(data)
  await delay(undefined)
}

export async function updateHomeBanner(
  input: HomeBannerInput,
): Promise<HomeBanner> {
  requireAuth()
  validateBannerInput(input)
  const data = readFile()
  data.banner = {
    enabled: Boolean(input.enabled),
    text: (input.text ?? data.banner.text ?? '').trim(),
    ctaLabel: (input.ctaLabel ?? data.banner.ctaLabel ?? '').trim(),
    ctaHref: (input.ctaHref ?? data.banner.ctaHref ?? '').trim(),
    updatedAt: new Date().toISOString(),
  }
  writeFile(data)
  return delay(data.banner)
}
