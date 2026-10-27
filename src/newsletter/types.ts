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
  newsItems: NewsletterNewsItemInput[]
  gigIds: string[]
  testTo?: string
  sendKey?: string
}

export type NewsletterPreview = {
  subject: string
  html: string
  text: string
}

export type NewsletterSendResult = {
  sent: number
  failed: number
  errors: string[]
}

export type NewsletterStatus = {
  configured: boolean
  total: number
  active: number
}

export type NewsletterImportResult = {
  added: number
  reactivated: number
  skipped: number
  invalid: number
  total: number
}

export function formatSubscriberDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
