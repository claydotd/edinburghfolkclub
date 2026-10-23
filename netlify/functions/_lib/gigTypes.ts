export type GigTicketPrices = {
  standard?: string
  unwaged?: string
  members?: string
}

export type Gig = {
  id: string
  date: string
  name: string
  description: string
  tickets: string
  ticketsAvailable: boolean
  website: string
  imagepath: string
  bodyMarkdown: string
  venue: string
  doors: string
  music: string
  ticketPrices: GigTicketPrices
  createdAt: string
  updatedAt: string
}

export type GigInput = {
  date: string
  name: string
  description?: string
  tickets?: string
  ticketsAvailable?: boolean
  website?: string
  imagepath?: string
  bodyMarkdown?: string
  venue?: string
  doors?: string
  music?: string
  ticketPrices?: GigTicketPrices
}

export type GigsState = {
  gigs: Gig[]
  updatedAt: string
}

export type GigImageUpload = {
  filename?: string
  contentType?: string
  dataBase64: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function emptyGigsState(): GigsState {
  return {
    gigs: [],
    updatedAt: new Date().toISOString(),
  }
}

export function validateGigInput(body: Partial<GigInput>): string | null {
  if (!body.date?.trim()) return 'Date is required'
  if (!DATE_RE.test(body.date.trim())) {
    return 'Date must be YYYY-MM-DD'
  }
  if (!body.name?.trim()) return 'Name is required'
  return null
}

export function normalizeGig(input: GigInput, existing?: Gig): Gig {
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

export function sortGigsChronological(gigs: Gig[]): Gig[] {
  return [...gigs].sort((a, b) => {
    if (a.date === b.date) return a.name.localeCompare(b.name)
    return a.date < b.date ? -1 : 1
  })
}

export function coerceGigsState(value: unknown): GigsState {
  if (!value || typeof value !== 'object') return emptyGigsState()
  const raw = value as Record<string, unknown>
  const list = Array.isArray(raw.gigs) ? raw.gigs : []
  const gigs = list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => coerceGig(item, index))
  return {
    gigs: sortGigsChronological(gigs),
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : new Date().toISOString(),
  }
}

/** Static flyers that were recompressed to WebP. Keeps already-saved gigs working. */
const REPLACED_GIG_IMAGES: Record<string, string> = {
  '/gig-pics/reid-kydd.jpg': '/gig-pics/reid-kydd.webp',
  '/gig-pics/pete-morton.jpg': '/gig-pics/pete-morton.webp',
  '/gig-pics/machray.jpg': '/gig-pics/machray.webp',
  '/gig-pics/judy-and-sally-folk-duo.jpg': '/gig-pics/judy-and-sally-folk-duo.webp',
  '/gig-pics/Curmudgeon.jpg': '/gig-pics/Curmudgeon.webp',
  '/gig-pics/burns.jpg': '/gig-pics/burns.webp',
}

export function currentGigImagePath(imagepath: string): string {
  return REPLACED_GIG_IMAGES[imagepath] ?? imagepath
}

function coerceGig(raw: Record<string, unknown>, index: number): Gig {
  const date =
    typeof raw.date === 'string' && DATE_RE.test(raw.date)
      ? raw.date
      : '1970-01-01'
  const prices =
    raw.ticketPrices && typeof raw.ticketPrices === 'object'
      ? (raw.ticketPrices as GigTicketPrices)
      : {}
  const now = new Date().toISOString()
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id
        : `gig-seed-${date}-${index}`,
    date,
    name: typeof raw.name === 'string' ? raw.name : 'Untitled gig',
    description: typeof raw.description === 'string' ? raw.description : '',
    tickets: typeof raw.tickets === 'string' ? raw.tickets : '',
    ticketsAvailable:
      typeof raw.ticketsAvailable === 'boolean' ? raw.ticketsAvailable : true,
    website: typeof raw.website === 'string' ? raw.website : '',
    imagepath:
      typeof raw.imagepath === 'string' ? currentGigImagePath(raw.imagepath) : '',
    bodyMarkdown: typeof raw.bodyMarkdown === 'string' ? raw.bodyMarkdown : '',
    venue: typeof raw.venue === 'string' ? raw.venue : '',
    doors: typeof raw.doors === 'string' ? raw.doors : '',
    music: typeof raw.music === 'string' ? raw.music : '',
    ticketPrices: {
      standard: typeof prices.standard === 'string' ? prices.standard : undefined,
      unwaged: typeof prices.unwaged === 'string' ? prices.unwaged : undefined,
      members: typeof prices.members === 'string' ? prices.members : undefined,
    },
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

export function isPastGigDate(date: string, today = localDateString()): boolean {
  return date < today
}

export function localDateString(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Well under 300KB so a season of flyers stays light. */
export const GIG_IMAGE_MAX_BYTES = 280 * 1024

export function publicGigImagePath(key: string): string {
  return `/.netlify/functions/gigs?resource=image&key=${encodeURIComponent(key)}`
}

export function parseGigImageKey(key: string | undefined | null): string | null {
  if (!key) return null
  const trimmed = key.trim()
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return null
  return trimmed
}
