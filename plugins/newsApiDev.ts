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
import { galleryStore } from '../netlify/functions/_lib/galleryStore.ts'
import type {
  GalleryImageUpload,
  GalleryPhotoInput,
  GalleryPhotoUpdateInput,
} from '../netlify/functions/_lib/galleryTypes.ts'
import {
  buildPublicIndex,
  parseGalleryImageKey,
  validateGalleryPhotoInput,
  validateGalleryPhotoUpdate,
} from '../netlify/functions/_lib/galleryTypes.ts'
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
import { newsletterContacts } from '../netlify/functions/_lib/newsletterContacts.ts'
import { verifyUnsubscribeToken } from '../netlify/functions/_lib/newsletterEmail.ts'
import { resendBroadcastConfigured } from '../netlify/functions/_lib/newsletterResend.ts'
import {
  newsletterSendingConfigured,
  previewNewsletterHtml,
  sendNewsletterBroadcast,
  sendNewsletterTest,
} from '../netlify/functions/_lib/newsletterSend.ts'
import type {
  NewsletterComposeInput,
  NewsletterSubscriberInput,
} from '../netlify/functions/_lib/newsletterTypes.ts'
import {
  isValidEmail,
  validateComposeInput,
  validateSubscribeInput,
} from '../netlify/functions/_lib/newsletterTypes.ts'
import { reservationStore } from '../netlify/functions/_lib/reservationStore.ts'
import {
  adminReservationView,
  createMemberReservations,
  memberReservationView,
  reservationErrorStatus,
} from '../netlify/functions/_lib/reservations.ts'
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

async function handleGallery(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (url.searchParams.get('resource')?.trim() === 'image') {
    const key = parseGalleryImageKey(url.searchParams.get('key'))
    if (!key) {
      sendJson(res, 400, { error: 'Missing image key' })
      return
    }
    const image = await galleryStore.getImage(key)
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

  const state = await galleryStore.list()
  sendJson(res, 200, buildPublicIndex(state))
}

async function handleGalleryAdmin(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  const cookies = req.headers.cookie
  if (!isAuthenticated(cookies)) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return
  }

  const id = url.searchParams.get('id')
  const action = url.searchParams.get('action')

  if (action === 'image' && req.method === 'POST') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as GalleryImageUpload)
      : ({} as GalleryImageUpload)
    if (!body.dataBase64?.trim()) {
      sendJson(res, 400, { error: 'Image data is required' })
      return
    }
    try {
      const uploaded = await galleryStore.uploadImage(body)
      sendJson(res, 201, uploaded)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      sendJson(res, 400, { error: message })
    }
    return
  }

  if (req.method === 'GET') {
    if (id) {
      const photo = await galleryStore.getById(id)
      if (!photo) {
        sendJson(res, 404, { error: 'Photo not found' })
        return
      }
      sendJson(res, 200, { photo })
      return
    }
    const state = await galleryStore.list()
    sendJson(res, 200, state)
    return
  }

  if (req.method === 'POST') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as GalleryPhotoInput)
      : ({} as GalleryPhotoInput)
    const error = validateGalleryPhotoInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      const photo = await galleryStore.create(body)
      sendJson(res, 201, { photo })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
      sendJson(res, 500, { error: message })
    }
    return
  }

  if (req.method === 'PUT') {
    if (!id) {
      sendJson(res, 400, { error: 'Missing id' })
      return
    }
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as GalleryPhotoUpdateInput)
      : ({} as GalleryPhotoUpdateInput)
    const error = validateGalleryPhotoUpdate(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      const photo = await galleryStore.update(id, body)
      sendJson(res, 200, { photo })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      sendJson(res, message.includes('not found') ? 404 : 500, { error: message })
    }
    return
  }

  if (req.method === 'DELETE') {
    if (!id) {
      sendJson(res, 400, { error: 'Missing id' })
      return
    }
    try {
      await galleryStore.remove(id)
      sendJson(res, 200, { ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      sendJson(res, message.includes('not found') ? 404 : 500, { error: message })
    }
    return
  }

  sendJson(res, 405, { error: 'Method not allowed' })
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

  if (action === 'reservations') {
    const memberId = memberIdFromCookies(req.headers.cookie)
    if (!memberId) {
      sendJson(res, 401, { error: 'Sign in to reserve tickets' })
      return
    }
    const member = await memberStore.getPublishedById(memberId)
    if (!member) {
      sendJson(
        res,
        401,
        { error: 'Sign in to reserve tickets' },
        { 'Set-Cookie': clearMemberSessionCookieHeader() },
      )
      return
    }

    if (req.method === 'GET') {
      sendJson(res, 200, await memberReservationView(member.id))
      return
    }

    if (req.method === 'POST') {
      const raw = await readBody(req)
      const body = raw ? (JSON.parse(raw) as { gigIds?: unknown }) : {}
      if (!Array.isArray(body.gigIds) || body.gigIds.some((id) => typeof id !== 'string')) {
        sendJson(res, 400, { error: 'Choose a gig to reserve' })
        return
      }
      try {
        sendJson(res, 200, await createMemberReservations(member.id, body.gigIds))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed'
        sendJson(res, reservationErrorStatus(message), { error: message })
      }
      return
    }
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
  const action = url.searchParams.get('action')

  if (req.method === 'GET' && action === 'reservations') {
    sendJson(res, 200, { gigs: await adminReservationView() })
    return
  }

  if (req.method === 'DELETE' && action === 'reservations') {
    const gigId = url.searchParams.get('gigId')?.trim()
    const memberId = url.searchParams.get('memberId')?.trim()
    if (!gigId || !memberId) {
      sendJson(res, 400, { error: 'Missing reservation' })
      return
    }
    try {
      await reservationStore.removeOne(memberId, gigId)
      sendJson(res, 200, { gigs: await adminReservationView() })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      sendJson(res, storeErrorStatus(message, 500), { error: message })
    }
    return
  }

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

function sendHtml(res: ServerResponse, title: string, body: string) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body><main><h1>${title}</h1>${body}</main></body>
</html>`)
}

async function handleNewsletter(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  const action = url.searchParams.get('action') ?? 'subscribe'

  if (req.method === 'GET' && action === 'unsubscribe') {
    const token = url.searchParams.get('token') ?? ''
    const id = verifyUnsubscribeToken(token)
    if (!id) {
      sendHtml(res, 'Unsubscribe', '<p>This unsubscribe link is invalid.</p>')
      return
    }
    try {
      await newsletterContacts.unsubscribe(id)
    } catch {
      // Already gone.
    }
    sendHtml(
      res,
      'Unsubscribed',
      '<p>You have been removed from the mailing list.</p>',
    )
    return
  }

  if (req.method === 'POST') {
    const raw = await readBody(req)
    const body = (
      raw
        ? JSON.parse(raw)
        : {}
    ) as NewsletterSubscriberInput & {
      consent?: boolean | string
      botField?: string
    }
    if (typeof body.botField === 'string' && body.botField.trim()) {
      sendJson(res, 200, { ok: true })
      return
    }
    const error = validateSubscribeInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    await newsletterContacts.subscribe({
      email: normalizeEmail(body.email ?? ''),
      source: body.source ?? 'signup',
    })
    sendJson(res, 200, { ok: true })
    return
  }

  sendJson(res, 405, { error: 'Method not allowed' })
}

async function handleNewsletterAdmin(
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
  const action = url.searchParams.get('action')

  if (req.method === 'GET' && action === 'status') {
    const subscribers = await newsletterContacts.list()
    const active = subscribers.filter((subscriber) => !subscriber.unsubscribedAt)
    sendJson(res, 200, {
      configured:
        newsletterSendingConfigured() && resendBroadcastConfigured(),
      total: subscribers.length,
      active: active.length,
    })
    return
  }

  if (req.method === 'GET') {
    if (id) {
      const subscriber = await newsletterContacts.getById(id)
      if (!subscriber) {
        sendJson(res, 404, { error: 'Subscriber not found' })
        return
      }
      sendJson(res, 200, { subscriber })
      return
    }
    sendJson(res, 200, { subscribers: await newsletterContacts.list() })
    return
  }

  if (req.method === 'POST' && action === 'preview') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as NewsletterComposeInput)
      : ({} as NewsletterComposeInput)
    const error = validateComposeInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    sendJson(res, 200, await previewNewsletterHtml(body))
    return
  }

  if (req.method === 'POST' && action === 'send-test') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as NewsletterComposeInput)
      : ({} as NewsletterComposeInput)
    const error = validateComposeInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      sendJson(res, 200, await sendNewsletterTest(body))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed'
      sendJson(res, 400, { error: message })
    }
    return
  }

  if (req.method === 'POST' && action === 'send') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as NewsletterComposeInput)
      : ({} as NewsletterComposeInput)
    const error = validateComposeInput(body)
    if (error) {
      sendJson(res, 400, { error })
      return
    }
    try {
      sendJson(res, 200, await sendNewsletterBroadcast(body))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Send failed'
      sendJson(res, 400, { error: message })
    }
    return
  }

  if (req.method === 'POST' && action === 'unsubscribe') {
    if (!id) {
      sendJson(res, 400, { error: 'Missing id' })
      return
    }
    try {
      const subscriber = await newsletterContacts.unsubscribe(id)
      sendJson(res, 200, { subscriber })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unsubscribe failed'
      sendJson(res, storeErrorStatus(message, 500), { error: message })
    }
    return
  }

  if (req.method === 'POST') {
    const raw = await readBody(req)
    const body = raw
      ? (JSON.parse(raw) as NewsletterSubscriberInput)
      : ({} as NewsletterSubscriberInput)
    const email = normalizeEmail(body.email ?? '')
    if (!email || !isValidEmail(email)) {
      sendJson(res, 400, { error: 'Enter a valid email address' })
      return
    }
    try {
      const subscriber = await newsletterContacts.create({
        email,
        source: body.source ?? 'admin',
      })
      sendJson(res, 201, { subscriber })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
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
      await newsletterContacts.remove(id)
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
          if (url.pathname === '/.netlify/functions/gallery') {
            await handleGallery(req, res, url)
            return
          }
          if (url.pathname === '/.netlify/functions/gallery-admin') {
            await handleGalleryAdmin(req, res, url)
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
          if (url.pathname === '/.netlify/functions/newsletter') {
            await handleNewsletter(req, res, url)
            return
          }
          if (url.pathname === '/.netlify/functions/newsletter-admin') {
            await handleNewsletterAdmin(req, res, url)
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
