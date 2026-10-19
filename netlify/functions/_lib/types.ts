export type NewsPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  bodyMarkdown: string
  published: boolean
  publishedAt: string | null
  hidePublishedDate: boolean
  createdAt: string
  updatedAt: string
}

export type NewsPostInput = {
  slug: string
  title: string
  excerpt?: string
  bodyMarkdown?: string
  published?: boolean
  hidePublishedDate?: boolean
}

export const BANNER_COLORS = [
  'thistle',
  'moss',
  'berry',
  'heather',
  'ink',
] as const

export type BannerColor = (typeof BANNER_COLORS)[number]

/** Single homepage banner item (rotated when multiple are enabled). */
export type HomeBanner = {
  id: string
  enabled: boolean
  text: string
  ctaLabel: string
  ctaHref: string
  color: BannerColor
  updatedAt: string
}

export type HomeBannerInput = {
  id?: string
  enabled?: boolean
  text?: string
  ctaLabel?: string
  ctaHref?: string
  color?: BannerColor
}

export type HomeBannersState = {
  items: HomeBanner[]
  updatedAt: string
}

export type HomeBannersInput = {
  items: HomeBannerInput[]
}

export function isBannerColor(value: unknown): value is BannerColor {
  return (
    typeof value === 'string' &&
    (BANNER_COLORS as readonly string[]).includes(value)
  )
}

export function emptyHomeBanners(): HomeBannersState {
  return {
    items: [],
    updatedAt: new Date().toISOString(),
  }
}

function newBannerId(): string {
  return crypto.randomUUID()
}

export function normalizeHomeBanner(
  input: HomeBannerInput,
  existing?: HomeBanner,
): HomeBanner {
  const color = isBannerColor(input.color)
    ? input.color
    : existing?.color ?? 'thistle'
  return {
    id: (input.id ?? existing?.id ?? newBannerId()).trim() || newBannerId(),
    enabled: Boolean(input.enabled),
    text: (input.text ?? existing?.text ?? '').trim(),
    ctaLabel: (input.ctaLabel ?? existing?.ctaLabel ?? '').trim(),
    ctaHref: (input.ctaHref ?? existing?.ctaHref ?? '').trim(),
    color,
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeHomeBanners(
  input: HomeBannersInput,
  existing?: HomeBannersState,
): HomeBannersState {
  const existingById = new Map(
    (existing?.items ?? []).map((item) => [item.id, item]),
  )
  const items = (input.items ?? []).map((raw) =>
    normalizeHomeBanner(raw, raw.id ? existingById.get(raw.id) : undefined),
  )
  return {
    items,
    updatedAt: new Date().toISOString(),
  }
}

function coerceBannerItem(
  value: Record<string, unknown>,
  fallbackId: string,
): HomeBanner {
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : fallbackId,
    enabled: Boolean(value.enabled),
    text: typeof value.text === 'string' ? value.text : '',
    ctaLabel: typeof value.ctaLabel === 'string' ? value.ctaLabel : '',
    ctaHref: typeof value.ctaHref === 'string' ? value.ctaHref : '',
    color: isBannerColor(value.color) ? value.color : 'thistle',
    updatedAt:
      typeof value.updatedAt === 'string'
        ? value.updatedAt
        : new Date().toISOString(),
  }
}

/** Accept stored blob/local JSON: new `{ items }` shape or legacy single banner. */
export function coerceHomeBanners(value: unknown): HomeBannersState {
  if (!value || typeof value !== 'object') return emptyHomeBanners()
  const raw = value as Record<string, unknown>

  if (Array.isArray(raw.items)) {
    const items = raw.items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => coerceBannerItem(item, `banner-${index + 1}`))
    return {
      items,
      updatedAt:
        typeof raw.updatedAt === 'string'
          ? raw.updatedAt
          : new Date().toISOString(),
    }
  }

  // Legacy single-banner object
  if ('text' in raw || 'enabled' in raw || 'ctaLabel' in raw) {
    const item = coerceBannerItem(raw, 'legacy')
    return {
      items: [item],
      updatedAt: item.updatedAt,
    }
  }

  return emptyHomeBanners()
}

export type NewsSnapshotPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  bodyMarkdown: string
  publishedAt: string | null
  hidePublishedDate: boolean
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
  hide_published_date: boolean
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
    hidePublishedDate: Boolean(row.hide_published_date),
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
    hidePublishedDate: Boolean(post.hidePublishedDate),
  }
}

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  return value
}
