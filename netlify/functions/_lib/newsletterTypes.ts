export type NewsletterSubscriberInput = {
  email: string
  source?: string
}

export type NewsletterSubscriber = {
  id: string
  email: string
  consentedAt: string
  unsubscribedAt: string | null
  source: string
  createdAt: string
  updatedAt: string
}

export type NewsletterNewsItemInput =
  | {
      source: 'custom'
      title: string
      body: string
      linkUrl?: string
      linkLabel?: string
    }
  | {
      source: 'post'
      postId: string
    }

export type NewsletterComposeInput = {
  subject: string
  message: string
  newsItems?: NewsletterNewsItemInput[]
  gigIds?: string[]
  testTo?: string
  /** Required for send-test and send; checked against NEWSLETTER_SEND_KEY. */
  sendKey?: string
}

/** Resolved block ready for the HTML/text email templates. */
export type NewsletterNewsItem = {
  title: string
  body: string
  href: string | null
  buttonLabel: string | null
  publishedAt: string | null
}

export type NewsletterGigItem = {
  id: string
  date: string
  name: string
  description: string
  venue: string
  doors: string
  music: string
  tickets: string
  ticketsAvailable: boolean
  imagepath: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email))
}

export function isValidNewsLink(href: string): boolean {
  const value = href.trim()
  if (!value) return true
  return (
    value.startsWith('/') ||
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.startsWith('mailto:')
  )
}

export function validateSubscribeInput(
  body: Partial<NewsletterSubscriberInput> & { consent?: boolean | string },
): string | null {
  const email = normalizeEmail(body.email ?? '')
  if (!email) return 'Email is required'
  if (!isValidEmail(email)) return 'Enter a valid email address'
  const consent = body.consent
  if (consent !== true && consent !== 'true' && consent !== 'on') {
    return 'Consent is required'
  }
  return null
}

function validateNewsItem(
  item: Partial<NewsletterNewsItemInput> | null | undefined,
  index: number,
): string | null {
  const label = `News item ${index + 1}`
  if (!item || typeof item !== 'object') {
    return `${label}: is incomplete`
  }
  if (item.source === 'post') {
    if (!('postId' in item) || !String(item.postId ?? '').trim()) {
      return `${label}: choose a news post`
    }
    return null
  }
  if (item.source === 'custom') {
    const title = String(item.title ?? '').trim()
    const body = String(item.body ?? '').trim()
    const linkUrl = String(item.linkUrl ?? '').trim()
    if (!title) return `${label}: heading is required`
    if (!body) return `${label}: body text is required`
    if (linkUrl && !isValidNewsLink(linkUrl)) {
      return `${label}: link must be a site path (/…), http(s) URL, or mailto:`
    }
    return null
  }
  return `${label}: choose custom text or an existing post`
}

export function validateComposeInput(
  body: Partial<NewsletterComposeInput>,
): string | null {
  const subject = (body.subject ?? '').trim()
  if (!subject) return 'Subject is required'
  if (subject.length > 200) return 'Subject is too long'
  const message = (body.message ?? '').trim()
  if (!message) return 'A written message is required'
  if (body.testTo) {
    const testTo = normalizeEmail(body.testTo)
    if (!isValidEmail(testTo)) return 'Enter a valid test email address'
  }
  if (Array.isArray(body.newsItems)) {
    for (let i = 0; i < body.newsItems.length; i++) {
      const error = validateNewsItem(body.newsItems[i], i)
      if (error) return error
    }
  }
  return null
}

export function asIsoTimestamp(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  const parsed = Date.parse(String(value ?? ''))
  if (Number.isNaN(parsed)) return new Date().toISOString()
  return new Date(parsed).toISOString()
}

export function asNullableIsoTimestamp(value: unknown): string | null {
  if (value == null || value === '') return null
  return asIsoTimestamp(value)
}
