import type { Handler } from '@netlify/functions'
import {
  clearSessionCookieHeader,
  createSessionToken,
  isAuthenticated,
  passwordsMatch,
  sessionCookieHeader,
} from './_lib/auth.ts'
import { json, noStoreHeaders, readJsonBody } from './_lib/http.ts'
import { newsStore } from './_lib/store.ts'
import type { HomeBannerInput, NewsPostInput } from './_lib/types.ts'

function unauthorized() {
  return json(401, { error: 'Unauthorized' }, noStoreHeaders())
}

function requireAuth(cookieHeader: string | undefined) {
  return isAuthenticated(cookieHeader)
}

function validateInput(body: Partial<NewsPostInput>): string | null {
  if (!body.title?.trim()) return 'Title is required'
  if (!body.slug?.trim()) return 'Slug is required'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim())) {
    return 'Slug must be lowercase letters, numbers, and hyphens'
  }
  return null
}

function validateBannerInput(body: Partial<HomeBannerInput>): string | null {
  const enabled = Boolean(body.enabled)
  const text = (body.text ?? '').trim()
  const ctaLabel = (body.ctaLabel ?? '').trim()
  const ctaHref = (body.ctaHref ?? '').trim()

  if (enabled) {
    if (!text) return 'Banner text is required when enabled'
    if (!ctaLabel) return 'CTA label is required when enabled'
    if (!ctaHref) return 'CTA link is required when enabled'
  }

  if (ctaHref) {
    const ok =
      ctaHref.startsWith('/') ||
      ctaHref.startsWith('https://') ||
      ctaHref.startsWith('http://') ||
      ctaHref.startsWith('mailto:')
    if (!ok) {
      return 'CTA link must be a site path (/…), http(s) URL, or mailto:'
    }
  }

  return null
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  const action = event.queryStringParameters?.action
  const cookies = event.headers.cookie || event.headers.Cookie

  try {
    if (event.httpMethod === 'POST' && action === 'login') {
      const body = await readJsonBody<{ password?: string }>(event.body)
      if (!body.password || !passwordsMatch(body.password)) {
        return json(401, { error: 'Invalid password' }, noStoreHeaders())
      }
      const token = createSessionToken()
      return json(
        200,
        { ok: true },
        {
          ...noStoreHeaders(),
          'Set-Cookie': sessionCookieHeader(token),
        },
      )
    }

    if (event.httpMethod === 'POST' && action === 'logout') {
      return json(
        200,
        { ok: true },
        {
          ...noStoreHeaders(),
          'Set-Cookie': clearSessionCookieHeader(),
        },
      )
    }

    if (event.httpMethod === 'GET' && action === 'me') {
      if (!requireAuth(cookies)) return unauthorized()
      return json(200, { ok: true }, noStoreHeaders())
    }

    if (!requireAuth(cookies)) return unauthorized()

    if (action === 'banner') {
      if (event.httpMethod === 'GET') {
        const banner = await newsStore.getBanner()
        return json(200, { banner }, noStoreHeaders())
      }
      if (event.httpMethod === 'PUT') {
        const body = await readJsonBody<HomeBannerInput>(event.body)
        const error = validateBannerInput(body)
        if (error) return json(400, { error }, noStoreHeaders())
        const banner = await newsStore.setBanner(body)
        return json(200, { banner }, noStoreHeaders())
      }
      return json(405, { error: 'Method not allowed' }, noStoreHeaders())
    }

    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id
      if (id) {
        const post = await newsStore.getById(id)
        if (!post) return json(404, { error: 'Post not found' }, noStoreHeaders())
        return json(200, { post }, noStoreHeaders())
      }
      const posts = await newsStore.listAll()
      return json(200, { posts }, noStoreHeaders())
    }

    if (event.httpMethod === 'POST') {
      const body = await readJsonBody<NewsPostInput>(event.body)
      const error = validateInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const post = await newsStore.create(body)
        return json(201, { post }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed'
        const status = message.includes('slug') ? 409 : 500
        return json(status, { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'PUT') {
      const id = event.queryStringParameters?.id
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      const body = await readJsonBody<NewsPostInput>(event.body)
      const error = validateInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const post = await newsStore.update(id, body)
        return json(200, { post }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed'
        const status = message.includes('not found')
          ? 404
          : message.includes('slug')
            ? 409
            : 500
        return json(status, { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      try {
        await newsStore.remove(id)
        return json(200, { ok: true }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed'
        const status = message.includes('not found') ? 404 : 500
        return json(status, { error: message }, noStoreHeaders())
      }
    }

    return json(405, { error: 'Method not allowed' }, noStoreHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return json(500, { error: message }, noStoreHeaders())
  }
}
