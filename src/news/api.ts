import * as demo from './demoStore'
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

/** Static / GitHub Pages prototype — no Netlify Functions. */
export function isNewsDemo(): boolean {
  const flag = import.meta.env.VITE_NEWS_DEMO
  return flag === '1' || flag === 'true'
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchNewsSnapshot(): Promise<NewsSnapshot> {
  if (isNewsDemo()) return demo.getSnapshot()
  const res = await fetch(NEWS_URL, { credentials: 'same-origin' })
  return parseJson<NewsSnapshot>(res)
}

export async function fetchNewsPost(
  slug: string,
): Promise<{ post: NewsSnapshotPost; updatedAt: string }> {
  if (isNewsDemo()) return demo.getPublishedPost(slug)
  const res = await fetch(`${NEWS_URL}?slug=${encodeURIComponent(slug)}`, {
    credentials: 'same-origin',
  })
  return parseJson(res)
}

export async function adminMe(): Promise<boolean> {
  if (isNewsDemo()) return demo.isAuthenticated()
  const res = await fetch(`${ADMIN_URL}?action=me`, { credentials: 'include' })
  return res.ok
}

export async function adminLogin(password: string): Promise<void> {
  if (isNewsDemo()) {
    await demo.login(password)
    return
  }
  const res = await fetch(`${ADMIN_URL}?action=login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  await parseJson(res)
}

export async function adminLogout(): Promise<void> {
  if (isNewsDemo()) {
    await demo.logout()
    return
  }
  const res = await fetch(`${ADMIN_URL}?action=logout`, {
    method: 'POST',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function adminListPosts(): Promise<NewsPost[]> {
  if (isNewsDemo()) return demo.listPosts()
  const res = await fetch(ADMIN_URL, { credentials: 'include' })
  const data = await parseJson<{ posts: NewsPost[] }>(res)
  return data.posts
}

export async function adminGetPost(id: string): Promise<NewsPost> {
  if (isNewsDemo()) return demo.getPost(id)
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    credentials: 'include',
  })
  const data = await parseJson<{ post: NewsPost }>(res)
  return data.post
}

export async function adminCreatePost(input: NewsPostInput): Promise<NewsPost> {
  if (isNewsDemo()) return demo.createPost(input)
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
  if (isNewsDemo()) return demo.updatePost(id, input)
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
  if (isNewsDemo()) {
    await demo.deletePost(id)
    return
  }
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function fetchHomeBanner(): Promise<HomeBanner> {
  if (isNewsDemo()) return demo.getHomeBanner()
  const res = await fetch(`${NEWS_URL}?resource=banner`, {
    credentials: 'same-origin',
  })
  const data = await parseJson<{ banner: HomeBanner }>(res)
  return data.banner
}

export async function adminGetHomeBanner(): Promise<HomeBanner> {
  if (isNewsDemo()) return demo.getHomeBanner()
  const res = await fetch(`${ADMIN_URL}?action=banner`, {
    credentials: 'include',
  })
  const data = await parseJson<{ banner: HomeBanner }>(res)
  return data.banner
}

export async function adminUpdateHomeBanner(
  input: HomeBannerInput,
): Promise<HomeBanner> {
  if (isNewsDemo()) return demo.updateHomeBanner(input)
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
