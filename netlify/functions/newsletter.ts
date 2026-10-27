import type { Handler } from '@netlify/functions'
import { connectBlobs } from './_lib/blobs.ts'
import { json, noStoreHeaders, readJsonBody } from './_lib/http.ts'
import { verifyUnsubscribeToken } from './_lib/newsletterEmail.ts'
import {
  syncResendSubscribeBestEffort,
  syncResendUnsubscribeBestEffort,
} from './_lib/newsletterResend.ts'
import { newsletterStore } from './_lib/newsletterStore.ts'
import {
  normalizeEmail,
  validateSubscribeInput,
  type NewsletterSubscriberInput,
} from './_lib/newsletterTypes.ts'

function htmlPage(title: string, body: string): {
  statusCode: number
  headers: Record<string, string>
  body: string
} {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...noStoreHeaders(),
    },
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; background: #fff0aa; color: #1f1435; }
    main { max-width: 32rem; margin: 4rem auto; padding: 2rem; background: #fff; border: 1px solid #1f1435; }
    a { color: #642297; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    ${body}
  </main>
</body>
</html>`,
  }
}

export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  const action = event.queryStringParameters?.action ?? 'subscribe'

  try {
    if (event.httpMethod === 'GET' && action === 'unsubscribe') {
      const token = event.queryStringParameters?.token ?? ''
      const id = verifyUnsubscribeToken(token)
      if (!id) {
        return htmlPage(
          'Unsubscribe',
          '<p>This unsubscribe link is invalid or expired.</p>',
        )
      }
      try {
        const existing = await newsletterStore.getById(id)
        await newsletterStore.unsubscribe(id)
        if (existing?.email) {
          await syncResendUnsubscribeBestEffort(existing.email)
        }
      } catch {
        // Treat missing ids as already gone.
      }
      return htmlPage(
        'Unsubscribed',
        '<p>You have been removed from the Edinburgh Folk Club mailing list.</p><p><a href="/">Back to the site</a></p>',
      )
    }

    if (event.httpMethod === 'POST' && (action === 'subscribe' || !event.queryStringParameters?.action)) {
      const body = await readJsonBody<
        NewsletterSubscriberInput & { consent?: boolean | string; botField?: string }
      >(event.body)

      // Honeypot — pretend success.
      if (typeof body.botField === 'string' && body.botField.trim()) {
        return json(200, { ok: true }, noStoreHeaders())
      }

      const error = validateSubscribeInput(body)
      if (error) return json(400, { error }, noStoreHeaders())

      const email = normalizeEmail(body.email)
      await newsletterStore.subscribe({
        email,
        source: body.source ?? 'signup',
      })
      await syncResendSubscribeBestEffort(email)
      return json(200, { ok: true }, noStoreHeaders())
    }

    return json(405, { error: 'Method not allowed' }, noStoreHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return json(500, { error: message }, noStoreHeaders())
  }
}
