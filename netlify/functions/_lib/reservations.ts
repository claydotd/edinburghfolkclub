import { gigStore } from './gigStore.ts'
import { memberStore } from './memberStore.ts'
import { todayIsoDate } from './memberTypes.ts'
import { reservationStore } from './reservationStore.ts'

export type ReservationGig = {
  id: string
  date: string
  name: string
}

export type MemberReservations = {
  available: ReservationGig[]
  reserved: ReservationGig[]
}

export type AdminReservationMember = {
  id: string
  name: string
  email: string
}

export type AdminGigReservations = {
  id: string
  date: string
  name: string
  count: number
  members: AdminReservationMember[]
}

function isUpcoming(date: string, today = todayIsoDate()): boolean {
  return date >= today
}

function toGig(gig: { id: string; date: string; name: string }): ReservationGig {
  return { id: gig.id, date: gig.date, name: gig.name }
}

export async function memberReservationView(memberId: string): Promise<MemberReservations> {
  const [state, reservations] = await Promise.all([
    gigStore.listPublished(),
    reservationStore.listByMember(memberId),
  ])
  const reservedIds = new Set(reservations.map((reservation) => reservation.gigId))
  const gigs = state.gigs.filter((gig) => isUpcoming(gig.date))
  return {
    available: gigs.filter((gig) => !reservedIds.has(gig.id)).map(toGig),
    reserved: gigs.filter((gig) => reservedIds.has(gig.id)).map(toGig),
  }
}

export async function createMemberReservations(
  memberId: string,
  gigIds: string[],
): Promise<MemberReservations> {
  const ids = [...new Set(gigIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) throw new Error('Choose a gig to reserve')

  const state = await gigStore.listPublished()
  const bookable = new Set(
    state.gigs.filter((gig) => isUpcoming(gig.date)).map((gig) => gig.id),
  )
  if (ids.some((id) => !bookable.has(id))) {
    throw new Error('That gig is not available to reserve')
  }

  try {
    await reservationStore.createMany(memberId, ids)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (/foreign key|violates/i.test(message)) {
      throw new Error('That gig is not available to reserve', { cause: err })
    }
    throw err
  }

  return memberReservationView(memberId)
}

export async function adminReservationView(): Promise<AdminGigReservations[]> {
  const [gigState, members, reservations] = await Promise.all([
    gigStore.list(),
    memberStore.list(),
    reservationStore.list(),
  ])
  const membersById = new Map(members.map((member) => [member.id, member]))
  const byGig = new Map<string, string[]>()
  for (const reservation of reservations) {
    const memberIds = byGig.get(reservation.gigId) ?? []
    memberIds.push(reservation.memberId)
    byGig.set(reservation.gigId, memberIds)
  }

  return gigState.gigs
    .filter((gig) => isUpcoming(gig.date))
    .map((gig) => {
      const people = (byGig.get(gig.id) ?? [])
        .flatMap((memberId) => {
          const member = membersById.get(memberId)
          if (!member) return []
          return [{ id: member.id, name: member.name, email: member.email }]
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
      return {
        id: gig.id,
        date: gig.date,
        name: gig.name,
        count: people.length,
        members: people,
      }
    })
}

export function reservationErrorStatus(message: string): number {
  if (
    message === 'Choose a gig to reserve' ||
    message === 'That gig is not available to reserve'
  ) {
    return 400
  }
  return 500
}
