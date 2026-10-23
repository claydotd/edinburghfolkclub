export type SitemapPost = {
  slug: string
  publishedAt: string | null
}

export type SitemapPage = {
  path: string
  changefreq: string
  priority: string
}

/** Public pages a crawler should index. Admin and signed-in member screens stay out. */
export const publicPages: SitemapPage[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/gallery', changefreq: 'monthly', priority: '0.7' },
  { path: '/news', changefreq: 'weekly', priority: '0.8' },
  { path: '/past-gigs', changefreq: 'weekly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact/play-at-efc', changefreq: 'monthly', priority: '0.5' },
  { path: '/members', changefreq: 'monthly', priority: '0.4' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
]

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function siteOriginFromEnv(): string {
  const configured = process.env.SITE_URL || process.env.URL || ''
  if (configured) return configured.replace(/\/$/, '')
  return 'https://efc1973.com'
}

export function absoluteUrl(origin: string, base: string, pathname: string): string {
  const originClean = origin.replace(/\/$/, '')
  const baseClean = !base || base === '/' ? '' : `/${base.replace(/^\/|\/$/g, '')}`
  if (pathname === '/') return `${originClean}${baseClean}/`
  return `${originClean}${baseClean}${pathname}`
}

export function renderSitemap(
  origin: string,
  base: string,
  posts: SitemapPost[],
): string {
  const articles = posts.filter((post) => SLUG.test(post.slug))
  const latest = latestTimestamp(articles.map((post) => post.publishedAt))
  const pages = publicPages.map((page) =>
    urlEntry(
      absoluteUrl(origin, base, page.path),
      page.changefreq,
      page.priority,
      page.path === '/news' ? latest : null,
    ),
  )
  const articleEntries = articles.map((post) =>
    urlEntry(
      absoluteUrl(origin, base, `/news/${post.slug}`),
      'monthly',
      '0.6',
      post.publishedAt,
    ),
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages,
    ...articleEntries,
    '</urlset>',
    '',
  ].join('\n')
}

export function renderRobots(origin: string, base: string): string {
  const prefix = !base || base === '/' ? '' : `/${base.replace(/^\/|\/$/g, '')}`
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Disallow: ${prefix}/admin`,
    `Disallow: ${prefix}/members/account`,
    `Disallow: ${prefix}/members/documents`,
    `Disallow: ${prefix}/members/tickets`,
    '',
    `Sitemap: ${absoluteUrl(origin, base, '/sitemap.xml')}`,
    '',
  ].join('\n')
}

function urlEntry(
  loc: string,
  changefreq: string,
  priority: string,
  lastmod: string | null,
): string {
  const lines = ['  <url>', `    <loc>${xmlEscape(loc)}</loc>`]
  const stamp = timestamp(lastmod)
  if (stamp) lines.push(`    <lastmod>${stamp}</lastmod>`)
  lines.push(`    <changefreq>${changefreq}</changefreq>`, `    <priority>${priority}</priority>`, '  </url>')
  return lines.join('\n')
}

function latestTimestamp(values: Array<string | null>): string | null {
  const stamps = values.map(timestamp).filter((value): value is string => Boolean(value))
  stamps.sort()
  return stamps.at(-1) ?? null
}

function timestamp(value: string | null): string | null {
  if (!value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return new Date(time).toISOString()
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
