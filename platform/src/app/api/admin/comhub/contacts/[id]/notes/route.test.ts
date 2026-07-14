import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: `body.notes ?? body.notes_private ?? body.notes_public` treated
 * an explicit `{ notes: null }` as nullish and fell through to the next key,
 * silently no-op'ing instead of clearing the client's notes field. Fix
 * resolves by which key is PRESENT in the body, not by its value.
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: vi.fn(async () => 'tenant-1'),
}))

let updatePayload: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'comhub_contacts') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'contact-1', client_id: 'client-1' } }),
            }),
          }),
        }),
      }
    }
    if (table === 'clients') {
      return {
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/contacts/contact-1/notes', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH contacts/[id]/notes', () => {
  beforeEach(() => {
    updatePayload = null
  })

  it('clears notes when notes is explicitly null', async () => {
    const res = await PATCH(makeRequest({ notes: null }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    const json = await res.json()

    expect(json).toEqual({ ok: true })
    expect(updatePayload).toEqual({ notes: null })
  })

  it('sets notes to the provided string', async () => {
    await PATCH(makeRequest({ notes: 'hello' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(updatePayload).toEqual({ notes: 'hello' })
  })

  it('is a noop when no recognized key is present', async () => {
    const res = await PATCH(makeRequest({}), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    const json = await res.json()
    expect(json).toEqual({ ok: true, noop: true })
    expect(updatePayload).toBeNull()
  })

  it('falls back to notes_private when notes key is absent', async () => {
    await PATCH(makeRequest({ notes_private: 'legacy' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(updatePayload).toEqual({ notes: 'legacy' })
  })
})
