import type { Handler } from '@netlify/functions'
import { renderRobots, siteOriginFromEnv } from './_lib/sitemap.ts'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method not allowed',
    }
  }

  const body = renderRobots(originFrom(event.headers), '/')
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control':
        'public, durable, s-maxage=3600, stale-while-revalidate=86400',
    },
    body: event.httpMethod === 'HEAD' ? '' : body,
  }
}

function originFrom(headers: Record<string, string | undefined>): string {
  const host = (headers['x-forwarded-host'] || headers.host || '').split(',')[0]?.trim()
  if (!host) return siteOriginFromEnv()
  const proto = (headers['x-forwarded-proto'] || 'https').split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`
}
