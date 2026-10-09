import type {
  HomeBanner,
  HomeBannerInput,
  NewsPost,
  NewsPostInput,
  NewsSnapshot,
  NewsSnapshotPost,
} from './types'

const NEWS_URL = '/.netlify/functions/news'
const ADMIN_URL = '/.netlify/functions/news-admin'

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchNewsSnapshot(): Promise<NewsSnapshot> {
  const res = await fetch(NEWS_URL, { credentials: 'same-origin' })
  return parseJson<NewsSnapshot>(res)
}

export async function fetchNewsPost(
  slug: string,
): Promise<{ post: NewsSnapshotPost; updatedAt: string }> {
  const res = await fetch(`${NEWS_URL}?slug=${encodeURIComponent(slug)}`, {
    credentials: 'same-origin',
  })
  return parseJson(res)
}

export async function adminMe(): Promise<boolean> {
  const res = await fetch(`${ADMIN_URL}?action=me`, { credentials: 'include' })
  return res.ok
}

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch(`${ADMIN_URL}?action=login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  await parseJson(res)
}

export async function adminLogout(): Promise<void> {
  const res = await fetch(`${ADMIN_URL}?action=logout`, {
    method: 'POST',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function adminListPosts(): Promise<NewsPost[]> {
  const res = await fetch(ADMIN_URL, { credentials: 'include' })
  const data = await parseJson<{ posts: NewsPost[] }>(res)
  return data.posts
}

export async function adminGetPost(id: string): Promise<NewsPost> {
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    credentials: 'include',
  })
  const data = await parseJson<{ post: NewsPost }>(res)
  return data.post
}

export async function adminCreatePost(input: NewsPostInput): Promise<NewsPost> {
  const res = await fetch(ADMIN_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ post: NewsPost }>(res)
  return data.post
}

export async function adminUpdatePost(
  id: string,
  input: NewsPostInput,
): Promise<NewsPost> {
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ post: NewsPost }>(res)
  return data.post
}

export async function adminDeletePost(id: string): Promise<void> {
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function fetchHomeBanner(): Promise<HomeBanner> {
  const res = await fetch(`${NEWS_URL}?resource=banner`, {
    credentials: 'same-origin',
  })
  const data = await parseJson<{ banner: HomeBanner }>(res)
  return data.banner
}

export async function adminGetHomeBanner(): Promise<HomeBanner> {
  const res = await fetch(`${ADMIN_URL}?action=banner`, {
    credentials: 'include',
  })
  const data = await parseJson<{ banner: HomeBanner }>(res)
  return data.banner
}

export async function adminUpdateHomeBanner(
  input: HomeBannerInput,
): Promise<HomeBanner> {
  const res = await fetch(`${ADMIN_URL}?action=banner`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ banner: HomeBanner }>(res)
  return data.banner
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function formatNewsDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
