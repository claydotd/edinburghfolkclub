import { Resend } from 'resend'
import { normalizeEmail } from './newsletterTypes.ts'

/** Injected into Broadcast HTML; Resend replaces per recipient. Do not escape. */
export const RESEND_UNSUBSCRIBE_URL = '{{{RESEND_UNSUBSCRIBE_URL}}}'

export function getResendApiKey(): string {
  return (process.env.RESEND_API_KEY ?? '').trim()
}

export function getResendSegmentId(): string {
  return (process.env.RESEND_SEGMENT_ID ?? '').trim()
}

export function getNewsletterFromAddress(): string {
  return (
    process.env.NEWSLETTER_FROM ??
    'Edinburgh Folk Club <newsletter@efc1973.com>'
  ).trim()
}

export function resendBroadcastConfigured(): boolean {
  return Boolean(getResendApiKey() && getResendSegmentId())
}

export function createResendClient(apiKey = getResendApiKey()): Resend {
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured. Add it in the Netlify environment to send mail.',
    )
  }
  return new Resend(apiKey)
}

function requireSegmentId(): string {
  const segmentId = getResendSegmentId()
  if (!segmentId) {
    throw new Error(
      'RESEND_SEGMENT_ID is not configured. Create a Segment in Resend and set its ID in the environment.',
    )
  }
  return segmentId
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

/**
 * Ensure the email is an active Resend Contact in the newsletter segment.
 * Best-effort: create, or update + add-to-segment if the contact already exists.
 */
export async function upsertResendContact(
  email: string,
  resend = createResendClient(),
): Promise<void> {
  const normalised = normalizeEmail(email)
  if (!normalised) return
  if (!resendBroadcastConfigured()) return

  const segmentId = requireSegmentId()
  const created = await resend.contacts.create({
    email: normalised,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  })
  if (!created.error) return

  const updated = await resend.contacts.update({
    email: normalised,
    unsubscribed: false,
  })
  if (updated.error) {
    throw new Error(
      errorMessage(updated.error, `Could not update Resend contact ${normalised}`),
    )
  }

  const added = await resend.contacts.segments.add({
    email: normalised,
    segmentId,
  })
  // Already in the segment is fine.
  if (added.error) {
    const message = errorMessage(added.error, '')
    if (/already|exist/i.test(message)) return
    throw new Error(message || `Could not add ${normalised} to Resend segment`)
  }
}

/** Mark the contact unsubscribed in Resend (stops Broadcast delivery). */
export async function unsubscribeResendContact(
  email: string,
  resend = createResendClient(),
): Promise<void> {
  const normalised = normalizeEmail(email)
  if (!normalised) return
  if (!getResendApiKey()) return

  const { error } = await resend.contacts.update({
    email: normalised,
    unsubscribed: true,
  })
  if (error) {
    const message = errorMessage(error, '')
    // Contact may not exist yet in Resend.
    if (/not found|does not exist/i.test(message)) return
    throw new Error(message || `Could not unsubscribe Resend contact ${normalised}`)
  }
}

/** Soft-remove: unsubscribe + drop from the newsletter segment when possible. */
export async function removeResendContact(
  email: string,
  resend = createResendClient(),
): Promise<void> {
  const normalised = normalizeEmail(email)
  if (!normalised) return
  if (!getResendApiKey()) return

  await unsubscribeResendContact(normalised, resend)

  const segmentId = getResendSegmentId()
  if (!segmentId) return
  const { error } = await resend.contacts.segments.remove({
    email: normalised,
    segmentId,
  })
  if (error) {
    const message = errorMessage(error, '')
    if (/not found|does not exist/i.test(message)) return
    // Non-fatal for local deletes — contact is already unsubscribed.
    console.warn(`Resend segment remove for ${normalised}: ${message}`)
  }
}

export type SyncContactsResult = {
  synced: number
  failed: number
  errors: string[]
}

/** Push every local active subscriber into Resend before a Broadcast. */
export async function syncContactsToResend(
  emails: string[],
): Promise<SyncContactsResult> {
  const result: SyncContactsResult = { synced: 0, failed: 0, errors: [] }
  if (!emails.length) return result
  if (!resendBroadcastConfigured()) {
    throw new Error(
      'Resend Broadcasts are not configured (RESEND_API_KEY and RESEND_SEGMENT_ID).',
    )
  }

  const resend = createResendClient()
  const chunkSize = 8
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (email) => {
        try {
          await upsertResendContact(email, resend)
          result.synced += 1
        } catch (err) {
          result.failed += 1
          const message = err instanceof Error ? err.message : 'Sync failed'
          if (result.errors.length < 8) {
            result.errors.push(`${normalizeEmail(email)}: ${message}`)
          }
        }
      }),
    )
  }
  return result
}

export type CreateBroadcastResult = {
  broadcastId: string
}

export async function createAndSendBroadcast(args: {
  subject: string
  html: string
  text: string
  name?: string
}): Promise<CreateBroadcastResult> {
  const resend = createResendClient()
  const segmentId = requireSegmentId()
  const { data, error } = await resend.broadcasts.create({
    segmentId,
    from: getNewsletterFromAddress(),
    subject: args.subject,
    html: args.html,
    text: args.text,
    name: args.name,
    send: true,
  })
  if (error || !data?.id) {
    throw new Error(errorMessage(error, 'Resend Broadcast create failed'))
  }
  return { broadcastId: data.id }
}

/** Await sync but never fail the local subscribe/admin path. */
export async function syncResendSubscribeBestEffort(email: string): Promise<void> {
  try {
    await upsertResendContact(email)
  } catch (err) {
    console.warn(
      'Resend contact sync (subscribe) failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

export async function syncResendUnsubscribeBestEffort(
  email: string,
): Promise<void> {
  try {
    await unsubscribeResendContact(email)
  } catch (err) {
    console.warn(
      'Resend contact sync (unsubscribe) failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

export async function syncResendRemoveBestEffort(email: string): Promise<void> {
  try {
    await removeResendContact(email)
  } catch (err) {
    console.warn(
      'Resend contact sync (remove) failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

export async function syncResendEmailsBestEffort(
  emails: string[],
): Promise<void> {
  if (!emails.length) return
  try {
    await syncContactsToResend(emails)
  } catch (err) {
    console.warn(
      'Resend contact sync (import) failed:',
      err instanceof Error ? err.message : err,
    )
  }
}
