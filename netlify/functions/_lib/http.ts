import type { HandlerResponse } from '@netlify/functions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
}

export function json(
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): HandlerResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }
}

export function publicCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control':
      'public, durable, s-maxage=60, stale-while-revalidate=300',
  }
}

export function noStoreHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
  }
}

export async function readJsonBody<T>(body: string | null): Promise<T> {
  if (!body) return {} as T
  return JSON.parse(body) as T
}
