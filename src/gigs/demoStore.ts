import seedJson from '../../gigs/gigs.json'
import type { Gig, GigInput, GigsState } from './types'
import { GIG_IMAGE_MAX_BYTES, formatBytes } from './types'

const DATA_KEY = 'efc-gigs-demo-v1'
const AUTH_KEY = 'efc-news-demo-auth'

type SeedGig = (typeof seedJson.gigs)[number]

function fromSeed(raw: SeedGig): Gig {
  const now = new Date().toISOString()
  return {
    id: `gig-seed-${raw.date}`,
    date: raw.date,
    name: raw.name,
    description: raw.description,
    tickets: 'tickets' in raw && typeof raw.tickets === 'string' ? raw.tickets : '',
    ticketsAvailable: true,
    website: 'website' in raw && typeof raw.website === 'string' ? raw.website : '',
    imagepath:
      'imagepath' in raw && typeof raw.imagepath === 'string' ? raw.imagepath : '',
    bodyMarkdown: '',
    venue: '',
    doors: '',
    music: '',
    ticketPrices: {},
    createdAt: now,
    updatedAt: now,
  }
}

function sortGigs(gigs: Gig[]): Gig[] {
  return [...gigs].sort((a, b) => {
    if (a.date === b.date) return a.name.localeCompare(b.name)
    return a.date < b.date ? -1 : 1
  })
}

function seedState(): GigsState {
  return {
    gigs: sortGigs(seedJson.gigs.map(fromSeed)),
    updatedAt: new Date().toISOString(),
  }
}

function readState(): GigsState {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) {
      const initial = seedState()
      writeState(initial)
      return initial
    }
    const parsed = JSON.parse(raw) as Partial<GigsState>
    if (!Array.isArray(parsed.gigs) || parsed.gigs.length === 0) {
      const initial = seedState()
      writeState(initial)
      return initial
    }
    return {
      gigs: sortGigs(
        (parsed.gigs as Gig[]).map((gig) => ({
          ...gig,
          ticketsAvailable: gig.ticketsAvailable !== false,
        })),
      ),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return seedState()
  }
}

function writeState(state: GigsState) {
  localStorage.setItem(DATA_KEY, JSON.stringify(state))
}

function requireAuth() {
  if (sessionStorage.getItem(AUTH_KEY) !== '1') {
    throw new Error('Unauthorized')
  }
}

function normalize(input: GigInput, existing?: Gig): Gig {
  const now = new Date().toISOString()
  const prices = input.ticketPrices ?? existing?.ticketPrices ?? {}
  return {
    id: existing?.id ?? crypto.randomUUID(),
    date: input.date.trim(),
    name: input.name.trim(),
    description: (input.description ?? existing?.description ?? '').trim(),
    tickets: (input.tickets ?? existing?.tickets ?? '').trim(),
    ticketsAvailable:
      input.ticketsAvailable ?? existing?.ticketsAvailable ?? true,
    website: (input.website ?? existing?.website ?? '').trim(),
    imagepath: (input.imagepath ?? existing?.imagepath ?? '').trim(),
    bodyMarkdown: input.bodyMarkdown ?? existing?.bodyMarkdown ?? '',
    venue: (input.venue ?? existing?.venue ?? '').trim(),
    doors: (input.doors ?? existing?.doors ?? '').trim(),
    music: (input.music ?? existing?.music ?? '').trim(),
    ticketPrices: {
      standard: (prices.standard ?? '').trim() || undefined,
      unwaged: (prices.unwaged ?? '').trim() || undefined,
      members: (prices.members ?? '').trim() || undefined,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), 40)
  })
}

export async function listGigs(): Promise<GigsState> {
  return delay(readState())
}

export async function getGig(id: string): Promise<Gig> {
  requireAuth()
  const gig = readState().gigs.find((g) => g.id === id)
  if (!gig) throw new Error('Gig not found')
  return delay(gig)
}

export async function createGig(input: GigInput): Promise<Gig> {
  requireAuth()
  if (!input.date?.trim() || !input.name?.trim()) {
    throw new Error('Date and name are required')
  }
  const state = readState()
  if (state.gigs.some((g) => g.date === input.date.trim())) {
    throw new Error('A gig already exists on this date')
  }
  const gig = normalize(input)
  writeState({
    gigs: sortGigs([...state.gigs, gig]),
    updatedAt: new Date().toISOString(),
  })
  return delay(gig)
}

export async function updateGig(id: string, input: GigInput): Promise<Gig> {
  requireAuth()
  const state = readState()
  const index = state.gigs.findIndex((g) => g.id === id)
  if (index < 0) throw new Error('Gig not found')
  if (state.gigs.some((g) => g.id !== id && g.date === input.date.trim())) {
    throw new Error('A gig already exists on this date')
  }
  const gig = normalize(input, state.gigs[index])
  const next = [...state.gigs]
  next[index] = gig
  writeState({
    gigs: sortGigs(next),
    updatedAt: new Date().toISOString(),
  })
  return delay(gig)
}

export async function deleteGig(id: string): Promise<void> {
  requireAuth()
  const state = readState()
  const next = state.gigs.filter((g) => g.id !== id)
  if (next.length === state.gigs.length) throw new Error('Gig not found')
  writeState({
    gigs: next,
    updatedAt: new Date().toISOString(),
  })
  await delay(undefined)
}

export async function uploadGigImage(input: {
  filename?: string
  contentType?: string
  dataBase64: string
}): Promise<{ key: string; imagepath: string }> {
  requireAuth()
  const raw = input.dataBase64.includes(',')
    ? input.dataBase64.split(',').pop()!
    : input.dataBase64
  const binary = atob(raw)
  if (binary.length > GIG_IMAGE_MAX_BYTES) {
    throw new Error(`Image must be under ${formatBytes(GIG_IMAGE_MAX_BYTES)}`)
  }
  const contentType = (input.contentType ?? 'image/jpeg').split(';')[0]
  const dataUrl = `data:${contentType};base64,${raw}`
  const key = `demo-${crypto.randomUUID()}`
  return delay({ key, imagepath: dataUrl })
}
