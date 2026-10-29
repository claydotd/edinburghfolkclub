import type { Handler } from '@netlify/functions'
import { isAuthenticated } from './_lib/auth.ts'
import { connectBlobs } from './_lib/blobs.ts'
import { galleryStore } from './_lib/galleryStore.ts'
import type {
  GalleryImageUpload,
  GalleryPhotoInput,
  GalleryPhotoUpdateInput,
} from './_lib/galleryTypes.ts'
import {
  validateGalleryPhotoInput,
  validateGalleryPhotoUpdate,
} from './_lib/galleryTypes.ts'
import { json, noStoreHeaders, readJsonBody } from './_lib/http.ts'

function unauthorized() {
  return json(401, { error: 'Unauthorized' }, noStoreHeaders())
}

function statusForStoreError(message: string, fallback: number): number {
  if (message.includes('not found')) return 404
  return fallback
}

export const handler: Handler = async (event) => {
  connectBlobs(event)
  if (event.httpMethod === 'OPTIONS') {
    return json(204, null)
  }

  const cookies = event.headers.cookie || event.headers.Cookie
  if (!isAuthenticated(cookies)) return unauthorized()

  const id = event.queryStringParameters?.id
  const action = event.queryStringParameters?.action

  try {
    if (action === 'image' && event.httpMethod === 'POST') {
      const body = await readJsonBody<GalleryImageUpload>(event.body)
      if (!body.dataBase64?.trim()) {
        return json(400, { error: 'Image data is required' }, noStoreHeaders())
      }
      try {
        const uploaded = await galleryStore.uploadImage(body)
        return json(201, uploaded, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        return json(400, { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'GET') {
      if (id) {
        const photo = await galleryStore.getById(id)
        if (!photo) {
          return json(404, { error: 'Photo not found' }, noStoreHeaders())
        }
        return json(200, { photo }, noStoreHeaders())
      }
      const state = await galleryStore.list()
      return json(200, state, noStoreHeaders())
    }

    if (event.httpMethod === 'POST') {
      const body = await readJsonBody<GalleryPhotoInput>(event.body)
      const error = validateGalleryPhotoInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const photo = await galleryStore.create(body as GalleryPhotoInput)
        return json(201, { photo }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      const body = await readJsonBody<GalleryPhotoUpdateInput>(event.body)
      const error = validateGalleryPhotoUpdate(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const photo = await galleryStore.update(id, body as GalleryPhotoUpdateInput)
        return json(200, { photo }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      try {
        await galleryStore.remove(id)
        return json(200, { ok: true }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    return json(405, { error: 'Method not allowed' }, noStoreHeaders())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return json(500, { error: message }, noStoreHeaders())
  }
}
