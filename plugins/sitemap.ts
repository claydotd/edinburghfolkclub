import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  renderRobots,
  renderSitemap,
  siteOriginFromEnv,
  type SitemapPost,
} from '../netlify/functions/_lib/sitemap.ts'

function postsForBuild(root: string): SitemapPost[] {
  const demo = process.env.VITE_NEWS_DEMO
  if (demo === '1' || demo === 'true') return postsFromDemoSource(root)

  const file = path.join(root, '.data', 'news-local.json')
  try {
    if (!fs.existsSync(file)) return []
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      snapshot?: { posts?: SitemapPost[] }
      posts?: Array<SitemapPost & { published?: boolean }>
    }
    if (Array.isArray(parsed.snapshot?.posts)) return parsed.snapshot.posts
    if (Array.isArray(parsed.posts)) {
      return parsed.posts
        .filter((post) => post.published !== false)
        .map((post) => ({ slug: post.slug, publishedAt: post.publishedAt }))
    }
  } catch {
    return []
  }
  return []
}

/** Read the Pages demo seed without importing app modules into the Node program. */
function postsFromDemoSource(root: string): SitemapPost[] {
  try {
    const source = fs.readFileSync(path.join(root, 'src/news/demoData.ts'), 'utf8')
    const posts: SitemapPost[] = []
    for (const chunk of source.split(/slug:\s*'/).slice(1)) {
      const slug = chunk.slice(0, chunk.indexOf("'"))
      const publishedAt = chunk.match(/publishedAt:\s*'([^']*)'/)?.[1] ?? null
      if (/published:\s*true/.test(chunk) && slug) posts.push({ slug, publishedAt })
    }
    return posts
  } catch {
    return []
  }
}

function requestOrigin(req: IncomingMessage): string {
  const host = req.headers.host
  if (!host) return siteOriginFromEnv()
  const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'
  return `${proto}://${host}`
}

function sendText(
  res: ServerResponse,
  status: number,
  type: string,
  body: string,
) {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-cache')
  res.end(body)
}

export function sitemapPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'sitemap',
    configResolved(resolved) {
      config = resolved
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        serveSitemap(req, res, next, server.config.base, config.root)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        serveSitemap(req, res, next, server.config.base, config.root)
      })
    },
    closeBundle() {
      if (config.command !== 'build') return
      const outDir = path.resolve(config.root, config.build.outDir)
      const origin = siteOriginFromEnv()
      const posts = postsForBuild(config.root)
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(
        path.join(outDir, 'sitemap.xml'),
        renderSitemap(origin, config.base, posts),
      )
      fs.writeFileSync(
        path.join(outDir, 'robots.txt'),
        renderRobots(origin, config.base),
      )
    },
  }
}

function serveSitemap(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  base: string,
  root: string,
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next()
    return
  }
  const pathname = (req.url ?? '/').split('?')[0] || '/'
  const prefix = !base || base === '/' ? '' : base.replace(/\/$/, '')
  const origin = requestOrigin(req)
  if (pathname === `${prefix}/sitemap.xml`) {
    const body = renderSitemap(origin, base, postsForBuild(root))
    sendText(res, 200, 'application/xml; charset=utf-8', req.method === 'HEAD' ? '' : body)
    return
  }
  if (pathname === `${prefix}/robots.txt`) {
    const body = renderRobots(origin, base)
    sendText(res, 200, 'text/plain; charset=utf-8', req.method === 'HEAD' ? '' : body)
    return
  }
  next()
}
