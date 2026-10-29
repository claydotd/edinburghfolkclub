import type { Handler } from '@netlify/functions'
import { connectBlobs } from './_lib/blobs.ts'
import { galleryStore } from './_lib/galleryStore.ts'
import {
  buildPublicIndex,
  parseGalleryImageKey,
} from './_lib/galleryTypes.ts'
import { json, publicCacheHeaders } from './_lib/http.ts'

export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const resource = event.queryStringParameters?.resource?.trim()

    if (resource === 'image') {
      const key = parseGalleryImageKey(event.queryStringParameters?.key)
      if (!key) return json(400, { error: 'Missing image key' })
      const image = await galleryStore.getImage(key)
      if (!image) return { statusCode: 404, body: 'Not found' }
      return {
        statusCode: 200,
        headers: {
          'Content-Type': image.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: image.buffer.toString('base64'),
        isBase64Encoded: true,
      }
    }

    const state = await galleryStore.list()
    return json(200, buildPublicIndex(state), publicCacheHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load gallery'
    return json(500, { error: message })
  }
}
