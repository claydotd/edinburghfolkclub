import { isNewsDemo } from '../news/api'
import type {
  NewsletterComposeInput,
  NewsletterImportResult,
  NewsletterPreview,
  NewsletterSendResult,
  NewsletterStatus,
  NewsletterSubscriber,
} from './types'

const PUBLIC_URL = '/.netlify/functions/newsletter'
const ADMIN_URL = '/.netlify/functions/newsletter-admin'

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function subscribeToNewsletter(
  email: string,
  consent: boolean,
): Promise<void> {
  if (isNewsDemo()) {
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    return
  }
  const res = await fetch(PUBLIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, consent, source: 'signup' }),
  })
  await parseJson(res)
}

export async function adminListSubscribers(): Promise<NewsletterSubscriber[]> {
  const res = await fetch(ADMIN_URL, { credentials: 'include' })
  const data = await parseJson<{ subscribers: NewsletterSubscriber[] }>(res)
  return data.subscribers
}

export async function adminNewsletterStatus(): Promise<NewsletterStatus> {
  const res = await fetch(`${ADMIN_URL}?action=status`, {
    credentials: 'include',
  })
  return parseJson<NewsletterStatus>(res)
}

export async function adminAddSubscriber(
  email: string,
): Promise<NewsletterSubscriber> {
  const res = await fetch(ADMIN_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'admin' }),
  })
  const data = await parseJson<{ subscriber: NewsletterSubscriber }>(res)
  return data.subscriber
}

export async function adminImportSubscribers(
  emails: string[],
): Promise<NewsletterImportResult> {
  const res = await fetch(`${ADMIN_URL}?action=import`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails, source: 'csv-import' }),
  })
  return parseJson<NewsletterImportResult>(res)
}

export async function adminUnsubscribeSubscriber(
  id: string,
): Promise<NewsletterSubscriber> {
  const res = await fetch(
    `${ADMIN_URL}?action=unsubscribe&id=${encodeURIComponent(id)}`,
    {
      method: 'POST',
      credentials: 'include',
    },
  )
  const data = await parseJson<{ subscriber: NewsletterSubscriber }>(res)
  return data.subscriber
}

export async function adminDeleteSubscriber(id: string): Promise<void> {
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function adminPreviewNewsletter(
  input: NewsletterComposeInput,
): Promise<NewsletterPreview> {
  const res = await fetch(`${ADMIN_URL}?action=preview`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<NewsletterPreview>(res)
}

export async function adminSendNewsletterTest(
  input: NewsletterComposeInput,
): Promise<{ to: string }> {
  const res = await fetch(`${ADMIN_URL}?action=send-test`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export async function adminSendNewsletter(
  input: NewsletterComposeInput,
): Promise<NewsletterSendResult> {
  const res = await fetch(`${ADMIN_URL}?action=send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<NewsletterSendResult>(res)
}
