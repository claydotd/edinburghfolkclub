import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  clearMemberSessionCookieHeader,
  clearSessionCookieHeader,
  createMemberSessionToken,
  createSessionToken,
  isAuthenticated,
  memberIdFromCookies,
  memberSessionCookieHeader,
  passwordsMatch,
  sessionCookieHeader,
} from '../netlify/functions/_lib/auth.ts'
import { gigStore } from '../netlify/functions/_lib/gigStore.ts'
import type {
  GigImageUpload,
  GigInput,
} from '../netlify/functions/_lib/gigTypes.ts'
import {
  parseGigImageKey,
  validateGigInput,
} from '../netlify/functions/_lib/gigTypes.ts'
import { localStore } from '../netlify/functions/_lib/localStore.ts'
import { memberStore } from '../netlify/functions/_lib/memberStore.ts'
import type { MemberInput } from '../netlify/functions/_lib/memberTypes.ts'
import {
  normalizeEmail,
  validateMemberInput,
} from '../netlify/functions/_lib/memberTypes.ts'
import type {
  HomeBannerInput,
  HomeBannersInput,
  NewsPostInput,
} from '../netlify/functions/_lib/types.ts'
import {
  BANNER_COLORS,
  isBannerColor,
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

function validateCtaHref(ctaHref: string): string | null {
  if (!ctaHref) return null
  const ok =
    ctaHref.startsWith('/') ||
    ctaHref.startsWith('https://') ||
    ctaHref.startsWith('http://') ||
    ctaHref.startsWith('mailto:')
  if (!ok) {
    return 'CTA link must be a site path (/…), http(s) URL, or mailto:'
  }
  return null
}

function validateBannerItem(
  body: Partial<HomeBannerInput>,
  index: number,
): string | null {
  const label = `Banner ${index + 1}`
  const enabled = Boolean(body.enabled)
  const text = (body.text ?? '').trim()
  const ctaLabel = (body.ctaLabel ?? '').trim()
  const ctaHref = (body.ctaHref ?? '').trim()

  if (enabled) {
    if (!text) return `${label}: text is required when enabled`
    if (!ctaLabel) return `${label}: CTA label is required when enabled`
    if (!ctaHref) return `${label}: CTA link is required when enabled`
  }

  if (body.color != null && !isBannerColor(body.color)) {
    return `${label}: colour must be one of ${BANNER_COLORS.join(', ')}`
  }

  const hrefError = validateCtaHref(ctaHref)
  if (hrefError) return `${label}: ${hrefError}`

  return null
}

function validateBannersInput(body: Partial<HomeBannersInput>): string | null {
  if (!Array.isArray(body.items)) {
    return 'Banners list is required'
  }
  if (body.items.length > 12) {
    return 'A maximum of 12 banners is allowed'
  }
  for (let i = 0; i < body.items.length; i++) {
    const error = validateBannerItem(body.items[i] ?? {}, i)
    if (error) return error
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
    const banners = await localStore.getBanner()
    sendJson(res, 200, { banners })
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

async function handleGigs(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (url.searchParams.get('resource')?.trim() === 'image') {
    const key = parseGigImageKey(url.searchParams.get('key'))
    if (!key) {
      sendJson(res, 400, { error: 'Missing image key' })
      return
    }
    const image = await gigStore.getImage(key)
    if (!image) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    res.writeHead(200, {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    res.end(image.buffer)
    return
  }

  const state = await gigStore.listPublished()
  const id = url.searchParams.get('id')?.trim()
  if (id) {
    const gig = state.gigs.find((g) => g.id === id)
    if (!gig) {
      sendJson(res, 404, { error: 'Gig not found' })
      return
    }
    sendJson(res, 200, { gig, updatedAt: state.updatedAt })
    return
  }
  sendJson(res, 200, state)
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
      const banners = await localStore.getBanner()
      sendJson(res, 200, { banners })
      return
    }
    if (req.method === 'PUT') {
      const raw = await readBody(req)
      const body = raw
        ? (JSON.parse(raw) as HomeBannersInput)
        : ({ items: [] } as HomeBannersInput)
      const error = validateBannersInput(body)
      if (error) {
        sendJson(res, 400, { error })
        return
      }
      const banners = await localStore.setBanner(body)
      sendJson(res, 200, { banners })
      return
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (action === 'gigs') {
    if (req.method === 'GET') {
      const id = url.searchParams.get('id')
      if (id) {
        const gig = await gigStore.getById(id)
        if (!gig) {
          sendJson(res, 404, { error: 'Gig not found' })
          return
        }
        sendJson(res, 200, { gig })
        return
      }
      const state = await gigStore.list()
      sendJson(res, 200, state)
      return
    }
    if (req.method === 'POST') {
      const raw = await readBody(req)
      const body = raw ? (JSON.parse(raw) as GigInput) : ({} as GigInput)
      const error = validateGigInput(body)
      if (error) {
        sendJson(res, 400, { error })
        return
      }
      try {
        const gig = await gigStore.create(body)
        sendJson(res, 201, { gig })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed'
        sendJson(res, message.includes('already exists') ? 409 : 500, {
          error: message,
        })
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
      const body = raw ? (JSON.parse(raw) as GigInput) : ({} as GigInput)
      const error = validateGigInput(body)
      if (error) {
        sendJson(res, 400, { error })
        return
      }
      try {
        const gig = await gigStore.update(id, body)
        sendJson(res, 200, { gig })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed'
        const status = message.includes('not found')
          ? 404
          : message.includes('already exists')
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
        await gigStore.remove(id)
        sendJson(res, 200, { ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed'
        sendJson(res, message.includes('not found') ? 404 : 500, {
          error: message,
        })
      }
      return
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (action === 'gig-image' && req.method === 'POST') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as GigImageUpload)
      : ({} as GigImageUpload)
    if (!body.dataBase64?.trim()) {
      sendJson(res, 400, { error: 'Image data is required' })
      return
    }
    try {
      const uploaded = await gigStore.uploadImage(body)
      sendJson(res, 201, uploaded)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      sendJson(res, 400, { error: message })
    }
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

const UNKNOWN_MEMBER_EMAIL = "We don't have that email on the membership list."

function storeErrorStatus(message: string, fallback: number): number {
  if (message.includes('not found')) return 404
  if (message.includes('already exists')) return 409
  return fallback
}

async function handleMembers(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  const action = url.searchParams.get('action')

  if (req.method === 'POST' && action === 'login') {
    const raw = await readBody(req)
    const body = raw ? (JSON.parse(raw) as { email?: string }) : {}
    const email = normalizeEmail(body.email ?? '')
    if (!email) {
      sendJson(res, 400, { error: 'Email is required' })
      return
    }
    const member = await memberStore.getPublishedByEmail(email)
    if (!member) {
      sendJson(res, 404, { error: UNKNOWN_MEMBER_EMAIL })
      return
    }
    sendJson(
      res,
      200,
      { member },
      { 'Set-Cookie': memberSessionCookieHeader(createMemberSessionToken(member.id)) },
    )
    return
  }

  if (req.method === 'POST' && action === 'logout') {
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearMemberSessionCookieHeader() })
    return
  }

  if (req.method === 'GET' && action === 'session') {
    const memberId = memberIdFromCookies(req.headers.cookie)
    if (!memberId) {
      sendJson(res, 200, { member: null })
      return
    }
    const member = await memberStore.getPublishedById(memberId)
    if (!member) {
      sendJson(
        res,
        200,
        { member: null },
        { 'Set-Cookie': clearMemberSessionCookieHeader() },
      )
      return
    }
    sendJson(res, 200, { member })
    return
  }

  sendJson(res, 405, { error: 'Method not allowed' })
}

async function handleMembersAdmin(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  if (!isAuthenticated(req.headers.cookie)) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return
  }

  const id = url.searchParams.get('id')?.trim()

  if (req.method === 'GET') {
    if (id) {
      const member = await memberStore.getById(id)
      if (!member) {
        sendJson(res, 404, { error: 'Member not found' })
        return
      }
      sendJson(res, 200, { member })
      return
    }
    sendJson(res, 200, { members: await memberStore.list() })
    return
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const raw = await readBody(req)
    const body = raw ? (JSON.parse(raw) as MemberInput) : ({} as MemberInput)
    const error = validateMemberInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      if (req.method === 'POST') {
        const member = await memberStore.create(body)
        sendJson(res, 201, { member })
        return
      }
      if (!id) {
        sendJson(res, 400, { error: 'Missing id' })
        return
      }
      const member = await memberStore.update(id, body)
      sendJson(res, 200, { member })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      sendJson(res, storeErrorStatus(message, 500), { error: message })
    }
    return
  }

  if (req.method === 'DELETE') {
    if (!id) {
      sendJson(res, 400, { error: 'Missing id' })
      return
    }
    try {
      await memberStore.remove(id)
      sendJson(res, 200, { ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      sendJson(res, storeErrorStatus(message, 500), { error: message })
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
          if (url.pathname === '/.netlify/functions/gigs') {
            await handleGigs(req, res, url)
            return
          }
          if (url.pathname === '/.netlify/functions/news-admin') {
            await handleAdmin(req, res, url)
            return
          }
          if (url.pathname === '/.netlify/functions/members') {
            await handleMembers(req, res, url)
            return
          }
          if (url.pathname === '/.netlify/functions/members-admin') {
            await handleMembersAdmin(req, res, url)
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
