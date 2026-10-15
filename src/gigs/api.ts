import { isNewsDemo } from '../news/api'
import * as demo from './demoStore'
import type { Gig, GigInput, GigsState } from './types'

const GIGS_URL = '/.netlify/functions/gigs'
const ADMIN_URL = '/.netlify/functions/news-admin'

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchGigs(): Promise<GigsState> {
  if (isNewsDemo()) return demo.listGigs()
  const res = await fetch(GIGS_URL, { credentials: 'same-origin' })
  return parseJson<GigsState>(res)
}

export async function adminListGigs(): Promise<Gig[]> {
  if (isNewsDemo()) {
    const state = await demo.listGigs()
    return state.gigs
  }
  const res = await fetch(`${ADMIN_URL}?action=gigs`, { credentials: 'include' })
  const data = await parseJson<GigsState>(res)
  return data.gigs
}

export async function adminGetGig(id: string): Promise<Gig> {
  if (isNewsDemo()) return demo.getGig(id)
  const res = await fetch(
    `${ADMIN_URL}?action=gigs&id=${encodeURIComponent(id)}`,
    { credentials: 'include' },
  )
  const data = await parseJson<{ gig: Gig }>(res)
  return data.gig
}

export async function adminCreateGig(input: GigInput): Promise<Gig> {
  if (isNewsDemo()) return demo.createGig(input)
  const res = await fetch(`${ADMIN_URL}?action=gigs`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ gig: Gig }>(res)
  return data.gig
}

export async function adminUpdateGig(
  id: string,
  input: GigInput,
): Promise<Gig> {
  if (isNewsDemo()) return demo.updateGig(id, input)
  const res = await fetch(
    `${ADMIN_URL}?action=gigs&id=${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  const data = await parseJson<{ gig: Gig }>(res)
  return data.gig
}

export async function adminDeleteGig(id: string): Promise<void> {
  if (isNewsDemo()) {
    await demo.deleteGig(id)
    return
  }
  const res = await fetch(
    `${ADMIN_URL}?action=gigs&id=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  )
  await parseJson(res)
}

export async function adminUploadGigImage(file: {
  blob: Blob
  filename: string
  contentType: string
}): Promise<{ key: string; imagepath: string }> {
  const dataBase64 = await blobToBase64(file.blob)
  if (isNewsDemo()) {
    return demo.uploadGigImage({
      filename: file.filename,
      contentType: file.contentType,
      dataBase64,
    })
  }
  const res = await fetch(`${ADMIN_URL}?action=gig-image`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.filename,
      contentType: file.contentType,
      dataBase64,
    }),
  })
  return parseJson(res)
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const base64 = result.includes(',') ? result.split(',')[1]! : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(blob)
  })
}
