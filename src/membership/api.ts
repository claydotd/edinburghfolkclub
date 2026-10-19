import type { Member, MemberInput } from './types'

const MEMBERS_URL = '/.netlify/functions/members'
const ADMIN_URL = '/.netlify/functions/members-admin'

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchMemberSession(): Promise<Member | null> {
  const res = await fetch(`${MEMBERS_URL}?action=session`, {
    credentials: 'include',
  })
  const data = await parseJson<{ member: Member | null }>(res)
  return data.member
}

export async function memberLogin(email: string): Promise<Member> {
  const res = await fetch(`${MEMBERS_URL}?action=login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await parseJson<{ member: Member }>(res)
  return data.member
}

export async function memberLogout(): Promise<void> {
  const res = await fetch(`${MEMBERS_URL}?action=logout`, {
    method: 'POST',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function adminListMembers(): Promise<Member[]> {
  const res = await fetch(ADMIN_URL, { credentials: 'include' })
  const data = await parseJson<{ members: Member[] }>(res)
  return data.members
}

export async function adminCreateMember(input: MemberInput): Promise<Member> {
  const res = await fetch(ADMIN_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ member: Member }>(res)
  return data.member
}

export async function adminUpdateMember(
  id: string,
  input: MemberInput,
): Promise<Member> {
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ member: Member }>(res)
  return data.member
}

export async function adminDeleteMember(id: string): Promise<void> {
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseJson(res)
}
