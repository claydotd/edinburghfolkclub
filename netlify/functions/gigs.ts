import type { Handler } from '@netlify/functions'
import { connectBlobs } from './_lib/blobs.ts'
import { gigStore } from './_lib/gigStore.ts'
import { json, publicCacheHeaders } from './_lib/http.ts'
import { parseGigImageKey } from './_lib/gigTypes.ts'

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
      const key = parseGigImageKey(event.queryStringParameters?.key)
      if (!key) return json(400, { error: 'Missing image key' })
      const image = await gigStore.getImage(key)
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

    const state = await gigStore.listPublished()
    const id = event.queryStringParameters?.id?.trim()
    if (id) {
      const gig = state.gigs.find((g) => g.id === id)
      if (!gig) return json(404, { error: 'Gig not found' }, publicCacheHeaders())
      return json(200, { gig, updatedAt: state.updatedAt }, publicCacheHeaders())
    }

    return json(200, state, publicCacheHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load gigs'
    return json(500, { error: message })
  }
}
