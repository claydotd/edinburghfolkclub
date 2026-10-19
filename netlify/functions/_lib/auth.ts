import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'efc_news_admin'
export const MEMBER_COOKIE = 'efc_member'
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

function getPassword(): string {
  return process.env.NEWS_ADMIN_PASSWORD ?? 'local-dev-password'
}

function getSecret(): string {
  return process.env.NEWS_ADMIN_SECRET ?? 'local-dev-secret-change-me'
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function passwordsMatch(provided: string): boolean {
  const expected = getPassword()
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = `exp:${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot < 0) return false
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = sign(payload)
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }
  const match = /^exp:(\d+)$/.exec(payload)
  if (!match) return false
  return Number(match[1]) > Date.now()
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NETLIFY || process.env.NODE_ENV === 'production'
  const parts = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NETLIFY || process.env.NODE_ENV === 'production'
  const parts = [
    `${ADMIN_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function isAuthenticated(cookieHeader: string | undefined): boolean {
  const cookies = parseCookies(cookieHeader)
  return verifySessionToken(cookies[ADMIN_COOKIE])
}

export function createMemberSessionToken(memberId: string): string {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = `member:${memberId}:${exp}`
  return `${payload}.${sign(payload)}`
}

export function readMemberId(token: string | undefined | null): string | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = sign(payload)
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  const match = /^member:([^:]+):(\d+)$/.exec(payload)
  if (!match) return null
  if (Number(match[2]) <= Date.now()) return null
  return match[1]
}

function memberCookie(value: string, maxAge: number): string {
  const secure = process.env.NETLIFY || process.env.NODE_ENV === 'production'
  const parts = [
    `${MEMBER_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function memberSessionCookieHeader(token: string): string {
  return memberCookie(encodeURIComponent(token), Math.floor(SESSION_TTL_MS / 1000))
}

export function clearMemberSessionCookieHeader(): string {
  return memberCookie('', 0)
}

export function memberIdFromCookies(cookieHeader: string | undefined): string | null {
  const cookies = parseCookies(cookieHeader)
  return readMemberId(cookies[MEMBER_COOKIE])
}
