export type MemberInput = {
  name: string
  email: string
  paid: boolean
  paidAt: string | null
}

export type MemberRecord = {
  id: string
  name: string
  email: string
  paid: boolean
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export type Member = MemberRecord & {
  expiresAt: string | null
  current: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateMemberInput(body: Partial<MemberInput>): string | null {
  const name = (body.name ?? '').trim()
  const email = normalizeEmail(body.email ?? '')
  if (!name) return 'Name is required'
  if (!email) return 'Email is required'
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address'

  const paid = Boolean(body.paid)
  const paidAt = (body.paidAt ?? '').trim()
  if (paid && !paidAt) return 'Paid date is required when paid is ticked'
  if (paidAt && !isCalendarDate(paidAt)) return 'Paid date must be a real calendar date'
  return null
}

export function normalizeMemberInput(body: MemberInput): {
  name: string
  email: string
  paid: boolean
  paidAt: string | null
} {
  const paidAt = (body.paidAt ?? '').trim()
  return {
    name: body.name.trim(),
    email: normalizeEmail(body.email),
    paid: Boolean(body.paid),
    paidAt: paidAt || null,
  }
}

export function addOneYear(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCFullYear(date.getUTCFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

export function todayIsoDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function toMember(record: MemberRecord): Member {
  const expiresAt = record.paidAt ? addOneYear(record.paidAt) : null
  const current = Boolean(
    record.paid && expiresAt && todayIsoDate() < expiresAt,
  )
  return { ...record, expiresAt, current }
}

export function asIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const match = DATE_RE.exec(String(value))
  return match ? match[1] : null
}

export function asIsoTimestamp(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  const parsed = Date.parse(String(value ?? ''))
  if (Number.isNaN(parsed)) return new Date().toISOString()
  return new Date(parsed).toISOString()
}

function isCalendarDate(isoDate: string): boolean {
  if (!DATE_RE.test(isoDate)) return false
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}
