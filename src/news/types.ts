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

export const BANNER_COLORS = [
  'thistle',
  'moss',
  'berry',
  'heather',
  'ink',
] as const

export type BannerColor = (typeof BANNER_COLORS)[number]

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
