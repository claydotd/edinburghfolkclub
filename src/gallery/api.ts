import { isNewsDemo } from '../news/api'
import * as demo from './demoStore'
import type {
  GalleryPhotoInput,
  GalleryPhotoRecord,
  GalleryPhotoUpdateInput,
  GalleryPublicIndex,
  GalleryState,
} from './types'

const PUBLIC_URL = '/.netlify/functions/gallery'
const ADMIN_URL = '/.netlify/functions/gallery-admin'

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function fetchGalleryIndex(): Promise<GalleryPublicIndex> {
  if (isNewsDemo()) return demo.fetchGalleryIndex()
  const res = await fetch(PUBLIC_URL, { credentials: 'same-origin' })
  return parseJson<GalleryPublicIndex>(res)
}

export async function adminListPhotos(): Promise<GalleryPhotoRecord[]> {
  if (isNewsDemo()) {
    const state = await demo.listPhotos()
    return state.photos
  }
  const res = await fetch(ADMIN_URL, { credentials: 'include' })
  const data = await parseJson<GalleryState>(res)
  return data.photos
}

export async function adminCreatePhoto(
  input: GalleryPhotoInput,
): Promise<GalleryPhotoRecord> {
  if (isNewsDemo()) return demo.createPhoto(input)
  const res = await fetch(ADMIN_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ photo: GalleryPhotoRecord }>(res)
  return data.photo
}

export async function adminUpdatePhoto(
  id: string,
  input: GalleryPhotoUpdateInput,
): Promise<GalleryPhotoRecord> {
  if (isNewsDemo()) return demo.updatePhoto(id, input)
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ photo: GalleryPhotoRecord }>(res)
  return data.photo
}

export async function adminDeletePhoto(id: string): Promise<void> {
  if (isNewsDemo()) {
    await demo.deletePhoto(id)
    return
  }
  const res = await fetch(`${ADMIN_URL}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await parseJson(res)
}

export async function adminUploadGalleryImage(file: {
  blob: Blob
  filename: string
  contentType: string
  size: 'grid' | 'full'
}): Promise<{ key: string; imagepath: string }> {
  const dataBase64 = await blobToBase64(file.blob)
  if (isNewsDemo()) {
    return demo.uploadImage({
      filename: file.filename,
      contentType: file.contentType,
      dataBase64,
      size: file.size,
    })
  }
  const res = await fetch(`${ADMIN_URL}?action=image`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.filename,
      contentType: file.contentType,
      dataBase64,
      size: file.size,
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
