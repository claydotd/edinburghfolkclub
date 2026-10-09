import type { Handler } from '@netlify/functions'
import { json, publicCacheHeaders } from './_lib/http.ts'
import { newsStore } from './_lib/store.ts'

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const resource = event.queryStringParameters?.resource?.trim()
    if (resource === 'banner') {
      const banner = await newsStore.getBanner()
      return json(200, { banner }, publicCacheHeaders())
    }

    const snapshot = await newsStore.getPublicSnapshot()
    const slug = event.queryStringParameters?.slug?.trim()

    if (slug) {
      const post = snapshot.posts.find((p) => p.slug === slug)
      if (!post) return json(404, { error: 'Post not found' }, publicCacheHeaders())
      return json(200, { post, updatedAt: snapshot.updatedAt }, publicCacheHeaders())
    }

    return json(200, snapshot, publicCacheHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load news'
    return json(500, { error: message })
  }
}
