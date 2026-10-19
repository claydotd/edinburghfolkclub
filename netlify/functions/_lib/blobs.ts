import { connectLambda } from '@netlify/blobs'

type HeaderValue = string | string[] | undefined

type BlobsLambdaEvent = {
  blobs?: string
  headers?: Record<string, HeaderValue>
}

/**
 * Netlify Functions run in Lambda compatibility mode, which does not set the
 * Blobs environment. Call this before any `getStore` in a handler.
 */
export function connectBlobs(event: BlobsLambdaEvent) {
  if (typeof event.blobs !== 'string' || !event.blobs) return
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (typeof value === 'string') headers[key] = value
    else if (Array.isArray(value) && value[0]) headers[key] = value[0]
  }
  connectLambda({ blobs: event.blobs, headers })
}
