import { Resend } from 'resend'

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
