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

/** Longest edge for a flyer image. The homepage crops these to a small square. */
export const GIG_IMAGE_MAX_EDGE = 1200
/** Well under 300KB so a season of flyers stays light. */
export const GIG_IMAGE_MAX_BYTES = 280 * 1024

export function localDateString(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isPastGigDate(date: string, today = localDateString()): boolean {
  return date < today
}

export function formatGigDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
