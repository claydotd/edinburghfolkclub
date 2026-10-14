import { DEMO_ADMIN_PASSWORD, DEMO_SEED_BANNERS, DEMO_SEED_POSTS } from './demoData'
import type {
  BannerColor,
  HomeBanner,
  HomeBannerInput,
  HomeBannersInput,
  HomeBannersState,
  NewsPost,
  NewsPostInput,
  NewsSnapshot,
  NewsSnapshotPost,
} from './types'
import { BANNER_COLORS } from './types'

const DATA_KEY = 'efc-news-demo'
const AUTH_KEY = 'efc-news-demo-auth'

type DemoFile = {
  posts: NewsPost[]
  banner: HomeBannersState
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
    banner: {
      items: DEMO_SEED_BANNERS.map((b) => ({ ...b })),
      updatedAt: DEMO_SEED_BANNERS[0]?.updatedAt ?? new Date().toISOString(),
    },
  }
}

function isBannerColor(value: unknown): value is BannerColor {
  return (
    typeof value === 'string' &&
    (BANNER_COLORS as readonly string[]).includes(value)
  )
}

function coerceBanners(value: unknown): HomeBannersState {
  if (!value || typeof value !== 'object') {
    return seedFile().banner
  }
  const raw = value as Record<string, unknown>

  if (Array.isArray(raw.items)) {
    const items = raw.items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => ({
        id: typeof item.id === 'string' ? item.id : `banner-${index + 1}`,
        enabled: Boolean(item.enabled),
        text: typeof item.text === 'string' ? item.text : '',
        ctaLabel: typeof item.ctaLabel === 'string' ? item.ctaLabel : '',
        ctaHref: typeof item.ctaHref === 'string' ? item.ctaHref : '',
        color: isBannerColor(item.color) ? item.color : ('thistle' as BannerColor),
        updatedAt:
          typeof item.updatedAt === 'string'
            ? item.updatedAt
            : new Date().toISOString(),
      }))
    return {
      items,
      updatedAt:
        typeof raw.updatedAt === 'string'
          ? raw.updatedAt
          : new Date().toISOString(),
    }
  }

  // Legacy single-banner object from older demo storage
  if ('text' in raw || 'enabled' in raw || 'ctaLabel' in raw) {
    const item: HomeBanner = {
      id: typeof raw.id === 'string' ? raw.id : 'legacy',
      enabled: Boolean(raw.enabled),
      text: typeof raw.text === 'string' ? raw.text : '',
      ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel : '',
      ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref : '',
      color: isBannerColor(raw.color) ? raw.color : 'thistle',
      updatedAt:
        typeof raw.updatedAt === 'string'
          ? raw.updatedAt
          : new Date().toISOString(),
    }
    return { items: [item], updatedAt: item.updatedAt }
  }

  return seedFile().banner
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
      banner: coerceBanners(parsed.banner),
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

function validateCtaHref(ctaHref: string): void {
  if (!ctaHref) return
  const ok =
    ctaHref.startsWith('/') ||
    ctaHref.startsWith('https://') ||
    ctaHref.startsWith('http://') ||
    ctaHref.startsWith('mailto:')
  if (!ok) {
    throw new Error('CTA link must be a site path (/…), http(s) URL, or mailto:')
  }
}

function validateBannerItem(input: HomeBannerInput, index: number): void {
  const label = `Banner ${index + 1}`
  const enabled = Boolean(input.enabled)
  const text = (input.text ?? '').trim()
  const ctaLabel = (input.ctaLabel ?? '').trim()
  const ctaHref = (input.ctaHref ?? '').trim()

  if (enabled) {
    if (!text) throw new Error(`${label}: text is required when enabled`)
    if (!ctaLabel) throw new Error(`${label}: CTA label is required when enabled`)
    if (!ctaHref) throw new Error(`${label}: CTA link is required when enabled`)
  }

  if (input.color != null && !isBannerColor(input.color)) {
    throw new Error(`${label}: colour must be one of ${BANNER_COLORS.join(', ')}`)
  }

  try {
    validateCtaHref(ctaHref)
  } catch (err) {
    throw new Error(
      `${label}: ${err instanceof Error ? err.message : 'Invalid CTA link'}`,
    )
  }
}

function validateBannersInput(input: HomeBannersInput): void {
  if (!Array.isArray(input.items)) {
    throw new Error('Banners list is required')
  }
  if (input.items.length > 12) {
    throw new Error('A maximum of 12 banners is allowed')
  }
  input.items.forEach((item, index) => validateBannerItem(item, index))
}

function normalizeBanner(
  input: HomeBannerInput,
  existing?: HomeBanner,
): HomeBanner {
  return {
    id: (input.id ?? existing?.id ?? crypto.randomUUID()).trim() || crypto.randomUUID(),
    enabled: Boolean(input.enabled),
    text: (input.text ?? existing?.text ?? '').trim(),
    ctaLabel: (input.ctaLabel ?? existing?.ctaLabel ?? '').trim(),
    ctaHref: (input.ctaHref ?? existing?.ctaHref ?? '').trim(),
    color: isBannerColor(input.color)
      ? input.color
      : existing?.color ?? 'thistle',
    updatedAt: new Date().toISOString(),
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

export async function getHomeBanners(): Promise<HomeBannersState> {
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

export async function updateHomeBanners(
  input: HomeBannersInput,
): Promise<HomeBannersState> {
  requireAuth()
  validateBannersInput(input)
  const data = readFile()
  const existingById = new Map(data.banner.items.map((item) => [item.id, item]))
  const items = input.items.map((raw) =>
    normalizeBanner(raw, raw.id ? existingById.get(raw.id) : undefined),
  )
  data.banner = {
    items,
    updatedAt: new Date().toISOString(),
  }
  writeFile(data)
  return delay(data.banner)
}
