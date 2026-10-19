import type { Handler } from '@netlify/functions'
import { isAuthenticated } from './_lib/auth.ts'
import { connectBlobs } from './_lib/blobs.ts'
import { json, noStoreHeaders, readJsonBody } from './_lib/http.ts'
import type { MemberInput } from './_lib/memberTypes.ts'
import { validateMemberInput } from './_lib/memberTypes.ts'
import { memberStore } from './_lib/memberStore.ts'

function unauthorized() {
  return json(401, { error: 'Unauthorized' }, noStoreHeaders())
}

function statusForStoreError(message: string, fallback: number): number {
  if (message.includes('not found')) return 404
  if (message.includes('already exists')) return 409
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

  try {
    if (event.httpMethod === 'GET') {
      if (id) {
        const member = await memberStore.getById(id)
        if (!member) return json(404, { error: 'Member not found' }, noStoreHeaders())
        return json(200, { member }, noStoreHeaders())
      }
      const members = await memberStore.list()
      return json(200, { members }, noStoreHeaders())
    }

    if (event.httpMethod === 'POST') {
      const body = await readJsonBody<MemberInput>(event.body)
      const error = validateMemberInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const member = await memberStore.create(body)
        return json(201, { member }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Create failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'PUT') {
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      const body = await readJsonBody<MemberInput>(event.body)
      const error = validateMemberInput(body)
      if (error) return json(400, { error }, noStoreHeaders())
      try {
        const member = await memberStore.update(id, body)
        return json(200, { member }, noStoreHeaders())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed'
        return json(statusForStoreError(message, 500), { error: message }, noStoreHeaders())
      }
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return json(400, { error: 'Missing id' }, noStoreHeaders())
      try {
        await memberStore.remove(id)
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
