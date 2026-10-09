import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  clearSessionCookieHeader,
  createSessionToken,
  isAuthenticated,
  passwordsMatch,
  sessionCookieHeader,
} from '../netlify/functions/_lib/auth.ts'
import { localStore } from '../netlify/functions/_lib/localStore.ts'
import type {
  HomeBannerInput,
  NewsPostInput,
} from '../netlify/functions/_lib/types.ts'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  const payload = body === null ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...extraHeaders,
  })
  res.end(payload)
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

async function handleNews(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (url.searchParams.get('resource')?.trim() === 'banner') {
    const banner = await localStore.getBanner()
    sendJson(res, 200, { banner })
    return
  }

  const snapshot = await localStore.getSnapshot()
  const slug = url.searchParams.get('slug')?.trim()
  if (slug) {
    const post = snapshot.posts.find((p) => p.slug === slug)
    if (!post) {
      sendJson(res, 404, { error: 'Post not found' })
      return
    }
    sendJson(res, 200, { post, updatedAt: snapshot.updatedAt })
    return
  }
  sendJson(res, 200, snapshot)
}

async function handleAdmin(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  const action = url.searchParams.get('action')
  const cookieHeader = req.headers.cookie

  if (req.method === 'POST' && action === 'login') {
    const raw = await readBody(req)
    const body = raw ? (JSON.parse(raw) as { password?: string }) : {}
    if (!body.password || !passwordsMatch(body.password)) {
      sendJson(res, 401, { error: 'Invalid password' })
      return
    }
    const token = createSessionToken()
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookieHeader(token) })
    return
  }

  if (req.method === 'POST' && action === 'logout') {
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookieHeader() })
    return
  }

  if (req.method === 'GET' && action === 'me') {
    if (!isAuthenticated(cookieHeader)) {
      sendJson(res, 401, { error: 'Unauthorized' })
      return
    }
    sendJson(res, 200, { ok: true })
    return
  }

  if (!isAuthenticated(cookieHeader)) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return
  }

  if (action === 'banner') {
    if (req.method === 'GET') {
      const banner = await localStore.getBanner()
      sendJson(res, 200, { banner })
      return
    }
    if (req.method === 'PUT') {
      const raw = await readBody(req)
      const body = raw
        ? (JSON.parse(raw) as HomeBannerInput)
        : ({} as HomeBannerInput)
      const error = validateBannerInput(body)
      if (error) {
        sendJson(res, 400, { error })
        return
      }
      const banner = await localStore.setBanner(body)
      sendJson(res, 200, { banner })
      return
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (req.method === 'GET') {
    const id = url.searchParams.get('id')
    if (id) {
      const post = await localStore.getById(id)
      if (!post) {
        sendJson(res, 404, { error: 'Post not found' })
        return
      }
      sendJson(res, 200, { post })
      return
    }
    const posts = await localStore.listAll()
    sendJson(res, 200, { posts })
    return
  }

  if (req.method === 'POST') {
    const raw = await readBody(req)
    const body = raw ? (JSON.parse(raw) as NewsPostInput) : ({} as NewsPostInput)
    const error = validateInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      const post = await localStore.create(body)
      sendJson(res, 201, { post })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
      sendJson(res, message.includes('slug') ? 409 : 500, { error: message })
    }
    return
  }

  if (req.method === 'PUT') {
    const id = url.searchParams.get('id')
    if (!id) {
      sendJson(res, 400, { error: 'Missing id' })
      return
    }
    const raw = await readBody(req)
    const body = raw ? (JSON.parse(raw) as NewsPostInput) : ({} as NewsPostInput)
    const error = validateInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      const post = await localStore.update(id, body)
      sendJson(res, 200, { post })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      const status = message.includes('not found')
        ? 404
        : message.includes('slug')
          ? 409
          : 500
      sendJson(res, status, { error: message })
    }
    return
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) {
      sendJson(res, 400, { error: 'Missing id' })
      return
    }
    try {
      await localStore.remove(id)
      sendJson(res, 200, { ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      sendJson(res, message.includes('not found') ? 404 : 500, { error: message })
    }
    return
  }

  sendJson(res, 405, { error: 'Method not allowed' })
}

/** Dev-only middleware mirroring /.netlify/functions/news(+-admin) against the local file store. */
export function newsApiDevPlugin(): Plugin {
  return {
    name: 'news-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          if (url.pathname === '/.netlify/functions/news') {
            await handleNews(req, res, url)
            return
          }
          if (url.pathname === '/.netlify/functions/news-admin') {
            await handleAdmin(req, res, url)
            return
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Server error'
          sendJson(res, 500, { error: message })
          return
        }
        next()
      })
    },
  }
}
