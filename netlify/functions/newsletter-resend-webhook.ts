import type { Handler } from '@netlify/functions'
import { connectBlobs } from './_lib/blobs.ts'
import { json, noStoreHeaders } from './_lib/http.ts'
import { createResendClient, getResendApiKey } from './_lib/newsletterResend.ts'

/**
 * Resend webhook receiver (signature verification).
 * The Resend Segment is the mailing-list source of truth, so contact events
 * do not need to update a local store — this endpoint acknowledges delivery.
 *
 * Configure in Resend → Webhooks pointing at:
 *   https://efc1973.com/.netlify/functions/newsletter-resend-webhook
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
    }) as { type?: string }

    return json(
      200,
      { ok: true, type: eventPayload.type ?? 'unknown' },
      noStoreHeaders(),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook failed'
    if (/invalid|signature|verify/i.test(message)) {
      return json(400, { error: 'Invalid webhook' }, noStoreHeaders())
    }
    console.error('newsletter-resend-webhook:', message)
    return json(500, { error: message }, noStoreHeaders())
  }
}
