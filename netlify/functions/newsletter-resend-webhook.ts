import type { Handler } from '@netlify/functions'
import { connectBlobs } from './_lib/blobs.ts'
import { json, noStoreHeaders } from './_lib/http.ts'
import { createResendClient, getResendApiKey } from './_lib/newsletterResend.ts'
import { newsletterStore } from './_lib/newsletterStore.ts'
import { normalizeEmail } from './_lib/newsletterTypes.ts'

/**
 * Resend → local subscriber sync.
 * Configure in Resend → Webhooks → contact.updated (and optionally contact.deleted)
 * pointing at /.netlify/functions/newsletter-resend-webhook
 * with signing secret in RESEND_WEBHOOK_SECRET.
 */
export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, noStoreHeaders())
  }

  const webhookSecret = (process.env.RESEND_WEBHOOK_SECRET ?? '').trim()
  const apiKey = getResendApiKey()
  if (!webhookSecret || !apiKey) {
    return json(
      503,
      { error: 'Webhook is not configured' },
      noStoreHeaders(),
    )
  }

  const payload = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : (event.body ?? '')

  const headers = event.headers ?? {}
  const svixId = headers['svix-id'] ?? headers['Svix-Id'] ?? ''
  const svixTimestamp =
    headers['svix-timestamp'] ?? headers['Svix-Timestamp'] ?? ''
  const svixSignature =
    headers['svix-signature'] ?? headers['Svix-Signature'] ?? ''

  try {
    const resend = createResendClient(apiKey)
    const eventPayload = resend.webhooks.verify({
      payload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    }) as {
      type?: string
      data?: {
        email?: string
        unsubscribed?: boolean
      }
    }

    const type = eventPayload.type ?? ''
    const email = normalizeEmail(eventPayload.data?.email ?? '')
    if (!email) {
      return json(200, { ok: true, ignored: true }, noStoreHeaders())
    }

    if (type === 'contact.updated' && eventPayload.data?.unsubscribed === true) {
      const subscriber = await newsletterStore.getByEmail(email)
      if (subscriber && !subscriber.unsubscribedAt) {
        await newsletterStore.unsubscribe(subscriber.id)
      }
      return json(200, { ok: true, unsubscribed: email }, noStoreHeaders())
    }

    if (type === 'contact.deleted') {
      const subscriber = await newsletterStore.getByEmail(email)
      if (subscriber) {
        await newsletterStore.remove(subscriber.id)
      }
      return json(200, { ok: true, deleted: email }, noStoreHeaders())
    }

    return json(200, { ok: true, ignored: type }, noStoreHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook failed'
    // Invalid signature / payload
    if (/invalid|signature|verify/i.test(message)) {
      return json(400, { error: 'Invalid webhook' }, noStoreHeaders())
    }
    console.error('newsletter-resend-webhook:', message)
    return json(500, { error: message }, noStoreHeaders())
  }
}
