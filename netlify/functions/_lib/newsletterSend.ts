import { timingSafeEqual } from 'node:crypto'
import { gigStore } from './gigStore.ts'
import { isPastGigDate } from './gigTypes.ts'
import { newsletterContacts } from './newsletterContacts.ts'
import {
  buildNewsletterEmailHtml,
  buildNewsletterText,
  siteBaseUrl,
} from './newsletterEmail.ts'
import {
  createAndSendBroadcast,
  createResendClient,
  getNewsletterFromAddress,
  getResendApiKey,
  RESEND_UNSUBSCRIBE_URL,
  resendBroadcastConfigured,
} from './newsletterResend.ts'
import type {
  NewsletterComposeInput,
  NewsletterGigItem,
  NewsletterNewsItem,
  NewsletterNewsItemInput,
} from './newsletterTypes.ts'
import { normalizeEmail } from './newsletterTypes.ts'
import { newsStore } from './store.ts'

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
  return Array.isArray(input.newsItems) ? input.newsItems : []
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

export type NewsletterBroadcastResult = {
  broadcastId: string
  recipientCount: number
  errors: string[]
}

async function sendOne(args: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const resend = createResendClient()
  const { error } = await resend.emails.send({
    from: getNewsletterFromAddress(),
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  })
  if (error) throw new Error(error.message)
}

export async function sendNewsletterTest(
  input: NewsletterComposeInput,
): Promise<{ to: string }> {
  assertNewsletterSendKey(input.sendKey)
  if (!getResendApiKey()) {
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

  await sendOne({
    to,
    subject: `[Test] ${payload.subject}`,
    html,
    text,
  })
  return { to }
}

export async function sendNewsletterBroadcast(
  input: NewsletterComposeInput,
): Promise<NewsletterBroadcastResult> {
  assertNewsletterSendKey(input.sendKey)
  if (!resendBroadcastConfigured()) {
    throw new Error(
      'Resend Broadcasts need RESEND_API_KEY and RESEND_SEGMENT_ID in the environment.',
    )
  }

  const payload = await buildComposePayload(input)
  const recipientCount = await newsletterContacts.countActive()
  if (!recipientCount) {
    throw new Error('There are no active subscribers in the Resend segment to send to')
  }

  const html = buildNewsletterEmailHtml({
    ...payload,
    unsubscribeHref: RESEND_UNSUBSCRIBE_URL,
  })
  const text = buildNewsletterText({
    ...payload,
    unsubscribeHref: RESEND_UNSUBSCRIBE_URL,
  })

  const { broadcastId } = await createAndSendBroadcast({
    subject: payload.subject,
    html,
    text,
    name: payload.subject.slice(0, 80),
  })

  return {
    broadcastId,
    recipientCount,
    errors: [],
  }
}
