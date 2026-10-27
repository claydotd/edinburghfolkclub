import type { Handler } from '@netlify/functions'
import { isAuthenticated } from './_lib/auth.ts'
import { connectBlobs } from './_lib/blobs.ts'
import { json, noStoreHeaders, readJsonBody } from './_lib/http.ts'
import {
  newsletterSendingConfigured,
  previewNewsletterHtml,
  sendNewsletterBroadcast,
  sendNewsletterTest,
} from './_lib/newsletterSend.ts'
import { newsletterStore } from './_lib/newsletterStore.ts'
import {
  normalizeEmail,
  validateComposeInput,
  type NewsletterComposeInput,
  type NewsletterSubscriberInput,
} from './_lib/newsletterTypes.ts'
import { isValidEmail } from './_lib/newsletterTypes.ts'

function unauthorized() {
  return json(401, { error: 'Unauthorized' }, noStoreHeaders())
}

function statusForStoreError(message: string, fallback: number): number {
  if (message.includes('not found')) return 404
  if (message.includes('already subscribed')) return 409
  return fallback
}

export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  const cookies = event.headers.cookie || event.headers.Cookie
  if (!isAuthenticated(cookies)) return unauthorized()

  const id = event.queryStringParameters?.id
  const action = event.queryStringParameters?.action

  try {
    if (event.httpMethod === 'GET' && action === 'status') {
      const subscribers = await newsletterStore.list()
      const active = subscribers.filter((subscriber) => !subscriber.unsubscribedAt)
      return json(
        200,
        {
          configured: newsletterSendingConfigured(),
          total: subscribers.length,
          active: active.length,
        },
        noStoreHeaders(),
      )
    }

    if (event.httpMethod === 'GET') {
      if (id) {
        const subscriber = await newsletterStore.getById(id)
        if (!subscriber) {
          return json(404, { error: 'Subscriber not found' }, noStoreHeaders())
        }
        return json(200, { subscriber }, noStoreHeaders())
      }
      const subscribers = await newsletterStore.list()
      return json(200, { subscribers }, noStoreHeaders())
    }

    if (event.httpMethod === 'POST' && action === 'preview') {
      const body = await readJsonBody<NewsletterComposeInput>(event.body)
      const error = validateComposeInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      const preview = await previewNewsletterHtml(body)
      return json(200, preview, noStoreHeaders())
    }

    if (event.httpMethod === 'POST' && action === 'send-test') {
      const body = await readJsonBody<NewsletterComposeInput>(event.body)
      const error = validateComposeInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const result = await sendNewsletterTest(body)
        return json(200, result, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed'
        return json(400, { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'POST' && action === 'send') {
      const body = await readJsonBody<NewsletterComposeInput>(event.body)
      const error = validateComposeInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const result = await sendNewsletterBroadcast(body)
        return json(200, result, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed'
        return json(400, { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'POST' && action === 'unsubscribe') {
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      try {
        const subscriber = await newsletterStore.unsubscribe(id)
        return json(200, { subscriber }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unsubscribe failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'POST' && action === 'import') {
      const body = await readJsonBody<{ emails?: unknown; source?: unknown }>(
        event.body,
      )
      if (!Array.isArray(body.emails)) {
        return json(400, { error: 'Provide an emails array' }, noStoreHeaders())
      }
      const MAX_IMPORT = 5000
      if (body.emails.length > MAX_IMPORT) {
        return json(
          400,
          { error: `Import is limited to ${MAX_IMPORT} rows at a time` },
          noStoreHeaders(),
        )
      }
      const valid: string[] = []
      let invalid = 0
      for (const raw of body.emails) {
        if (typeof raw !== 'string') {
          invalid += 1
          continue
        }
        const email = normalizeEmail(raw)
        if (!email || !isValidEmail(email)) {
          invalid += 1
          continue
        }
        valid.push(email)
      }
      const source =
        typeof body.source === 'string' && body.source.trim()
          ? body.source.trim()
          : 'csv-import'
      try {
        const result = await newsletterStore.importMany(valid, source)
        return json(
          200,
          { ...result, invalid, total: body.emails.length },
          noStoreHeaders(),
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Import failed'
        return json(500, { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'POST') {
      const body = await readJsonBody<NewsletterSubscriberInput>(event.body)
      const email = normalizeEmail(body.email ?? '')
      if (!email || !isValidEmail(email)) {
        return json(400, { error: 'Enter a valid email address' }, noStoreHeaders())
      }
      try {
        const subscriber = await newsletterStore.create({
          email,
          source: body.source ?? 'admin',
        })
        return json(201, { subscriber }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      try {
        await newsletterStore.remove(id)
        return json(200, { ok: true }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    return json(405, { error: 'Method not allowed' }, noStoreHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return json(500, { error: message }, noStoreHeaders())
  }
}
