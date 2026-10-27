import {
  createResendClient,
  getResendSegmentId,
  resendBroadcastConfigured,
} from './newsletterResend.ts'
import {
  asIsoTimestamp,
  normalizeEmail,
  type NewsletterSubscriber,
  type NewsletterSubscriberInput,
} from './newsletterTypes.ts'

type ResendContact = {
  id: string
  email: string
  created_at: string
  unsubscribed: boolean
  first_name?: string | null
  last_name?: string | null
}

function requireConfigured(): void {
  if (!resendBroadcastConfigured()) {
    throw new Error(
      'Newsletter contacts need RESEND_API_KEY and RESEND_SEGMENT_ID in the environment.',
    )
  }
}

function requireSegmentId(): string {
  requireConfigured()
  return getResendSegmentId()
}

function errorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function contactToSubscriber(contact: ResendContact): NewsletterSubscriber {
  const createdAt = asIsoTimestamp(contact.created_at)
  return {
    id: contact.id,
    email: normalizeEmail(contact.email),
    consentedAt: createdAt,
    // Resend only exposes a boolean; use createdAt as a non-null marker when unsubscribed.
    unsubscribedAt: contact.unsubscribed ? createdAt : null,
    source: 'resend',
    createdAt,
    updatedAt: createdAt,
  }
}

async function listAllInSegment(): Promise<ResendContact[]> {
  const resend = createResendClient()
  const segmentId = requireSegmentId()
  const contacts: ResendContact[] = []
  let after: string | undefined

  for (;;) {
    const { data, error } = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    })
    if (error) {
      throw new Error(errorMessage(error, 'Could not list Resend contacts'))
    }
    const page = data?.data ?? []
    contacts.push(...page)
    if (!data?.has_more || page.length === 0) break
    after = page[page.length - 1]?.id
    if (!after) break
  }

  return contacts
}

async function getContactById(id: string): Promise<ResendContact | null> {
  const resend = createResendClient()
  const { data, error } = await resend.contacts.get({ id })
  if (error || !data) {
    const message = errorMessage(error, '')
    if (/not found|does not exist/i.test(message) || !data) return null
    throw new Error(message || 'Could not load Resend contact')
  }
  return data
}

async function getContactByEmail(email: string): Promise<ResendContact | null> {
  const resend = createResendClient()
  const { data, error } = await resend.contacts.get({ email })
  if (error || !data) {
    const message = errorMessage(error, '')
    if (/not found|does not exist/i.test(message) || !data) return null
    throw new Error(message || 'Could not load Resend contact')
  }
  return data
}

async function ensureInSegment(email: string): Promise<void> {
  const resend = createResendClient()
  const segmentId = requireSegmentId()
  const { error } = await resend.contacts.segments.add({ email, segmentId })
  if (error) {
    const message = errorMessage(error, '')
    if (/already|exist/i.test(message)) return
    throw new Error(message || `Could not add ${email} to Resend segment`)
  }
}

/**
 * Create or reactivate a contact in the newsletter segment.
 * Returns the contact id when create succeeds; otherwise looks up by email.
 */
async function upsertActive(email: string): Promise<NewsletterSubscriber> {
  const resend = createResendClient()
  const segmentId = requireSegmentId()
  const normalised = normalizeEmail(email)

  const created = await resend.contacts.create({
    email: normalised,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  })
  if (!created.error && created.data?.id) {
    const contact = await getContactById(created.data.id)
    if (contact) return contactToSubscriber(contact)
    return {
      id: created.data.id,
      email: normalised,
      consentedAt: new Date().toISOString(),
      unsubscribedAt: null,
      source: 'resend',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const updated = await resend.contacts.update({
    email: normalised,
    unsubscribed: false,
  })
  if (updated.error) {
    throw new Error(
      errorMessage(updated.error, `Could not update Resend contact ${normalised}`),
    )
  }
  await ensureInSegment(normalised)
  const contact = await getContactByEmail(normalised)
  if (!contact) {
    throw new Error(`Resend contact ${normalised} was updated but could not be loaded`)
  }
  return contactToSubscriber(contact)
}

export const newsletterContacts = {
  async list(): Promise<NewsletterSubscriber[]> {
    const contacts = await listAllInSegment()
    return contacts
      .map(contactToSubscriber)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async listActive(): Promise<NewsletterSubscriber[]> {
    const all = await this.list()
    return all.filter((subscriber) => !subscriber.unsubscribedAt)
  },

  async countActive(): Promise<number> {
    const contacts = await listAllInSegment()
    return contacts.filter((contact) => !contact.unsubscribed).length
  },

  async getById(id: string): Promise<NewsletterSubscriber | null> {
    requireConfigured()
    const contact = await getContactById(id.trim())
    return contact ? contactToSubscriber(contact) : null
  },

  async getByEmail(email: string): Promise<NewsletterSubscriber | null> {
    requireConfigured()
    const contact = await getContactByEmail(normalizeEmail(email))
    return contact ? contactToSubscriber(contact) : null
  },

  /** Public signup. Re-activates an unsubscribed address. */
  async subscribe(
    input: NewsletterSubscriberInput,
  ): Promise<NewsletterSubscriber> {
    const email = normalizeEmail(input.email)
    if (!email) throw new Error('Email is required')
    return upsertActive(email)
  },

  /** Admin add. Throws if already an active subscriber. */
  async create(
    input: NewsletterSubscriberInput,
  ): Promise<NewsletterSubscriber> {
    const email = normalizeEmail(input.email)
    if (!email) throw new Error('Email is required')
    const existing = await getContactByEmail(email)
    if (existing && !existing.unsubscribed) {
      throw new Error('That email is already subscribed')
    }
    return upsertActive(email)
  },

  async importMany(
    emails: string[],
  ): Promise<{ added: number; reactivated: number; skipped: number }> {
    requireConfigured()
    const existingByEmail = new Map(
      (await listAllInSegment()).map((contact) => [
        normalizeEmail(contact.email),
        contact,
      ]),
    )
    let added = 0
    let reactivated = 0
    let skipped = 0
    const seen = new Set<string>()

    for (const raw of emails) {
      const email = normalizeEmail(raw)
      if (!email || seen.has(email)) {
        skipped += 1
        continue
      }
      seen.add(email)

      const existing = existingByEmail.get(email)
      if (existing && !existing.unsubscribed) {
        skipped += 1
        continue
      }

      await upsertActive(email)
      if (!existing) added += 1
      else reactivated += 1
    }

    return { added, reactivated, skipped }
  },

  async unsubscribe(id: string): Promise<NewsletterSubscriber> {
    requireConfigured()
    const resend = createResendClient()
    const existing = await getContactById(id.trim())
    if (!existing) throw new Error('Subscriber not found')
    if (existing.unsubscribed) return contactToSubscriber(existing)

    const { error } = await resend.contacts.update({
      id: existing.id,
      unsubscribed: true,
    })
    if (error) {
      throw new Error(errorMessage(error, 'Could not unsubscribe contact'))
    }
    return contactToSubscriber({ ...existing, unsubscribed: true })
  },

  async remove(id: string): Promise<void> {
    requireConfigured()
    const resend = createResendClient()
    const existing = await getContactById(id.trim())
    if (!existing) throw new Error('Subscriber not found')

    const segmentId = getResendSegmentId()
    if (segmentId) {
      await resend.contacts.segments.remove({
        contactId: existing.id,
        segmentId,
      })
    }

    const { error } = await resend.contacts.remove({ id: existing.id })
    if (error) {
      const message = errorMessage(error, '')
      if (/not found|does not exist/i.test(message)) return
      throw new Error(message || 'Could not delete Resend contact')
    }
  },
}
