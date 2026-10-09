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
