import type { Handler } from '@netlify/functions'
import { connectBlobs } from './_lib/blobs.ts'
import { renderSitemap, siteOriginFromEnv, type SitemapPost } from './_lib/sitemap.ts'
import { newsStore } from './_lib/store.ts'

export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method not allowed',
    }
  }

  let posts: SitemapPost[] = []
  try {
    const snapshot = await newsStore.getPublicSnapshot()
    posts = snapshot.posts.map((post) => ({
      slug: post.slug,
      publishedAt: post.publishedAt,
    }))
  } catch {
    posts = []
  }

  const body = renderSitemap(originFrom(event.headers), '/', posts)
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control':
        'public, durable, s-maxage=3600, stale-while-revalidate=86400',
    },
    body: event.httpMethod === 'HEAD' ? '' : body,
  }
}

function originFrom(headers: Record<string, string | undefined>): string {
  const host = firstHeader(headers['x-forwarded-host'] || headers.host)
  if (!host) return siteOriginFromEnv()
  const proto = firstHeader(headers['x-forwarded-proto']) || 'https'
  return `${proto}://${host}`
}

function firstHeader(value: string | undefined): string {
  return value?.split(',')[0]?.trim() ?? ''
}
