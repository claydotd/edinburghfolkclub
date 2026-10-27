import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { gigStore } from './gigStore.ts'
import { isPastGigDate } from './gigTypes.ts'
import {
  buildNewsletterEmailHtml,
  buildNewsletterText,
  siteBaseUrl,
  unsubscribeUrl,
} from './newsletterEmail.ts'
import { newsletterStore } from './newsletterStore.ts'
import type {
  NewsletterComposeInput,
  NewsletterGigItem,
  NewsletterNewsItem,
  NewsletterNewsItemInput,
} from './newsletterTypes.ts'
import { normalizeEmail } from './newsletterTypes.ts'
import { newsStore } from './store.ts'

function getResendApiKey(): string {
  return (process.env.RESEND_API_KEY ?? '').trim()
}

function getFromAddress(): string {
  return (
    process.env.NEWSLETTER_FROM ??
    'Edinburgh Folk Club <newsletter@efc1973.com>'
  ).trim()
}

function getNewsletterSendKey(): string {
  return (process.env.NEWSLETTER_SEND_KEY ?? '').trim()
}

export function newsletterSendingConfigured(): boolean {
  return Boolean(getResendApiKey() && getNewsletterSendKey())
}

export function assertNewsletterSendKey(provided: string | undefined): void {
  const expected = getNewsletterSendKey()
  if (!expected) {
    throw new Error(
      'NEWSLETTER_SEND_KEY is not configured. Add it in the environment to send mail.',
    )
  }
  const a = Buffer.from(provided ?? '')
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Incorrect send password')
  }
}

function newsInputsFromCompose(
  input: NewsletterComposeInput,
): NewsletterNewsItemInput[] {
  if (Array.isArray(input.newsItems) && input.newsItems.length) {
    return input.newsItems
  }
  // Back-compat for older clients that only sent post ids.
  if (Array.isArray(input.newsPostIds) && input.newsPostIds.length) {
    return input.newsPostIds.map((postId) => ({
      source: 'post' as const,
      postId,
    }))
  }
  return []
}

async function resolveNewsItems(
  inputs: NewsletterNewsItemInput[],
): Promise<NewsletterNewsItem[]> {
  if (!inputs.length) return []
  const posts = await newsStore.listAll()
  const byId = new Map(posts.map((post) => [post.id, post]))
  const resolved: NewsletterNewsItem[] = []

  for (const item of inputs) {
    if (item.source === 'custom') {
      const title = item.title.trim()
      const body = item.body.trim()
      const linkUrl = (item.linkUrl ?? '').trim()
      const linkLabel = (item.linkLabel ?? '').trim() || 'Find out more'
      if (!title || !body) continue
      resolved.push({
        title,
        body,
        href: linkUrl || null,
        buttonLabel: linkUrl ? linkLabel : null,
        publishedAt: null,
      })
      continue
    }

    const post = byId.get(item.postId.trim())
    if (!post || !post.published) continue
    resolved.push({
      title: post.title,
      body: post.excerpt.trim(),
      href: `/news/${post.slug}`,
      buttonLabel: 'Read more',
      publishedAt: post.publishedAt,
    })
  }

  return resolved
}

async function resolveGigs(
  ids: string[] | undefined,
): Promise<NewsletterGigItem[]> {
  if (!ids?.length) return []
  const wanted = new Set(ids)
  const { gigs } = await gigStore.list()
  return gigs
    .filter((gig) => wanted.has(gig.id) && !isPastGigDate(gig.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((gig) => ({
      id: gig.id,
      date: gig.date,
      name: gig.name,
      description: gig.description,
      venue: gig.venue,
      doors: gig.doors,
      music: gig.music,
      tickets: gig.tickets,
      ticketsAvailable: gig.ticketsAvailable,
      imagepath: gig.imagepath,
    }))
}

export async function buildComposePayload(input: NewsletterComposeInput) {
  const subject = input.subject.trim()
  const message = input.message.trim()
  const newsPosts = await resolveNewsItems(newsInputsFromCompose(input))
  const gigs = await resolveGigs(input.gigIds)
  return { subject, message, newsPosts, gigs }
}

export async function previewNewsletterHtml(
  input: NewsletterComposeInput,
): Promise<{ subject: string; html: string; text: string }> {
  const payload = await buildComposePayload(input)
  const html = buildNewsletterEmailHtml({
    ...payload,
    unsubscribeHref: `${siteBaseUrl()}/contact#newsletter`,
  })
  const text = buildNewsletterText({
    ...payload,
    unsubscribeHref: `${siteBaseUrl()}/contact#newsletter`,
  })
  return { subject: payload.subject, html, text }
}

type SendResult = {
  sent: number
  failed: number
  errors: string[]
}

async function sendOne(args: {
  resend: Resend
  from: string
  to: string
  subject: string
  html: string
  text: string
  unsubscribeHref?: string
}): Promise<void> {
  const headers: Record<string, string> = {}
  if (args.unsubscribeHref) {
    headers['List-Unsubscribe'] = `<${args.unsubscribeHref}>`
  }
  const { error } = await args.resend.emails.send({
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    headers: Object.keys(headers).length ? headers : undefined,
  })
  if (error) throw new Error(error.message)
}

export async function sendNewsletterTest(
  input: NewsletterComposeInput,
): Promise<{ to: string }> {
  assertNewsletterSendKey(input.sendKey)
  const apiKey = getResendApiKey()
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured. Add it in the Netlify environment to send mail.',
    )
  }
  const to = normalizeEmail(input.testTo ?? '')
  if (!to) throw new Error('Test recipient is required')

  const payload = await buildComposePayload(input)
  const html = buildNewsletterEmailHtml({
    ...payload,
    unsubscribeHref: `${siteBaseUrl()}/contact#newsletter`,
  })
  const text = buildNewsletterText({
    ...payload,
    unsubscribeHref: `${siteBaseUrl()}/contact#newsletter`,
  })

  const resend = new Resend(apiKey)
  await sendOne({
    resend,
    from: getFromAddress(),
    to,
    subject: `[Test] ${payload.subject}`,
    html,
    text,
  })
  return { to }
}

export async function sendNewsletterBroadcast(
  input: NewsletterComposeInput,
): Promise<SendResult> {
  assertNewsletterSendKey(input.sendKey)
  const apiKey = getResendApiKey()
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured. Add it in the Netlify environment to send mail.',
    )
  }

  const payload = await buildComposePayload(input)
  const subscribers = await newsletterStore.listActive()
  if (!subscribers.length) {
    throw new Error('There are no active subscribers to send to')
  }

  const resend = new Resend(apiKey)
  const from = getFromAddress()
  const result: SendResult = { sent: 0, failed: 0, errors: [] }

  // Resend rate limits; send in small sequential batches.
  const chunkSize = 8
  for (let i = 0; i < subscribers.length; i += chunkSize) {
    const chunk = subscribers.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (subscriber) => {
        const unsub = unsubscribeUrl(subscriber.id)
        const html = buildNewsletterEmailHtml({
          ...payload,
          unsubscribeHref: unsub,
        })
        const text = buildNewsletterText({
          ...payload,
          unsubscribeHref: unsub,
        })
        try {
          await sendOne({
            resend,
            from,
            to: subscriber.email,
            subject: payload.subject,
            html,
            text,
            unsubscribeHref: unsub,
          })
          result.sent += 1
        } catch (err) {
          result.failed += 1
          const message = err instanceof Error ? err.message : 'Send failed'
          if (result.errors.length < 8) {
            result.errors.push(`${subscriber.email}: ${message}`)
          }
        }
      }),
    )
  }

  return result
}
