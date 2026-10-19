export type Member = {
  id: string
  name: string
  email: string
  paid: boolean
  paidAt: string | null
  expiresAt: string | null
  current: boolean
}

export type MemberInput = {
  name: string
  email: string
  paid: boolean
  paidAt: string | null
}

export function formatMemberDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!match) return ''
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function memberStatusLabel(member: Pick<Member, 'paid' | 'current'>): string {
  if (!member.paid) return 'Unpaid'
  return member.current ? 'Current' : 'Expired'
}
