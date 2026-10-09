export type NewsPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  bodyMarkdown: string
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type NewsPostInput = {
  slug: string
  title: string
  excerpt?: string
  bodyMarkdown?: string
  published?: boolean
}

/** Homepage banner shown below the nav when enabled. */
export type HomeBanner = {
  enabled: boolean
  text: string
  ctaLabel: string
  ctaHref: string
  updatedAt: string
}

export type HomeBannerInput = {
  enabled?: boolean
  text?: string
  ctaLabel?: string
  ctaHref?: string
}

export function emptyHomeBanner(): HomeBanner {
  return {
    enabled: false,
    text: '',
    ctaLabel: '',
    ctaHref: '',
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeHomeBanner(
  input: HomeBannerInput,
  existing?: HomeBanner,
): HomeBanner {
  return {
    enabled: Boolean(input.enabled),
    text: (input.text ?? existing?.text ?? '').trim(),
    ctaLabel: (input.ctaLabel ?? existing?.ctaLabel ?? '').trim(),
    ctaHref: (input.ctaHref ?? existing?.ctaHref ?? '').trim(),
    updatedAt: new Date().toISOString(),
  }
}

export type NewsSnapshotPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  bodyMarkdown: string
  publishedAt: string | null
}

export type NewsSnapshot = {
  updatedAt: string
  posts: NewsSnapshotPost[]
}

export type DbNewsRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  body_markdown: string
  published: boolean
  published_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

export function rowToPost(row: DbNewsRow): NewsPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    bodyMarkdown: row.body_markdown ?? '',
    published: Boolean(row.published),
    publishedAt: toIso(row.published_at),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  }
}

export function postToSnapshotPost(post: NewsPost): NewsSnapshotPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    publishedAt: post.publishedAt,
  }
}

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  return value
}
