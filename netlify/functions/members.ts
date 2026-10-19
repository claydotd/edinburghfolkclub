import type { Handler } from '@netlify/functions'
import {
  clearMemberSessionCookieHeader,
  createMemberSessionToken,
  memberIdFromCookies,
  memberSessionCookieHeader,
} from './_lib/auth.ts'
import { connectBlobs } from './_lib/blobs.ts'
import { json, noStoreHeaders, readJsonBody } from './_lib/http.ts'
import { normalizeEmail } from './_lib/memberTypes.ts'
import { memberStore } from './_lib/memberStore.ts'

const UNKNOWN_EMAIL = "We don't have that email on the membership list."

export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  const action = event.queryStringParameters?.action
  const cookies = event.headers.cookie || event.headers.Cookie

  try {
    if (event.httpMethod === 'POST' && action === 'login') {
      const body = await readJsonBody<{ email?: string }>(event.body)
      const email = normalizeEmail(body.email ?? '')
      if (!email) {
        return json(400, { error: 'Email is required' }, noStoreHeaders())
      }
      const member = await memberStore.getPublishedByEmail(email)
      if (!member) {
        return json(404, { error: UNKNOWN_EMAIL }, noStoreHeaders())
      }
      const token = createMemberSessionToken(member.id)
      return json(
        200,
        { member },
        {
          ...noStoreHeaders(),
          'Set-Cookie': memberSessionCookieHeader(token),
        },
      )
    }

    if (event.httpMethod === 'POST' && action === 'logout') {
      return json(
        200,
        { ok: true },
        {
          ...noStoreHeaders(),
          'Set-Cookie': clearMemberSessionCookieHeader(),
        },
      )
    }

    if (event.httpMethod === 'GET' && action === 'session') {
      const memberId = memberIdFromCookies(cookies)
      if (!memberId) {
        return json(200, { member: null }, noStoreHeaders())
      }
      const member = await memberStore.getPublishedById(memberId)
      if (!member) {
        return json(
          200,
          { member: null },
          {
            ...noStoreHeaders(),
            'Set-Cookie': clearMemberSessionCookieHeader(),
          },
        )
      }
      return json(200, { member }, noStoreHeaders())
    }

    return json(405, { error: 'Method not allowed' }, noStoreHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return json(500, { error: message }, noStoreHeaders())
  }
}
