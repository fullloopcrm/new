import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

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

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { PATCH } from './route'

function currentClient() {
  return h.store.clients.find((c) => c.id === 'client-1')!
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/contacts/contact-1/notes', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH contacts/[id]/notes', () => {
  beforeEach(() => {
    h.seq = 0
    h.store = {
      comhub_contacts: [
        { id: 'contact-1', tenant_id: 'tenant-1', client_id: 'client-1' },
      ],
      clients: [
        { id: 'client-1', tenant_id: 'tenant-1', notes: 'original' },
      ],
    }
  })

  it('clears notes when notes is explicitly null', async () => {
    const res = await PATCH(makeRequest({ notes: null }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    const json = await res.json()

    expect(json).toEqual({ ok: true })
    expect(currentClient().notes).toBeNull()
  })

  it('sets notes to the provided string', async () => {
    await PATCH(makeRequest({ notes: 'hello' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(currentClient().notes).toBe('hello')
  })

  it('is a noop when no recognized key is present', async () => {
    const res = await PATCH(makeRequest({}), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    const json = await res.json()
    expect(json).toEqual({ ok: true, noop: true })
    expect(currentClient().notes).toBe('original')
  })

  it('falls back to notes_private when notes key is absent', async () => {
    await PATCH(makeRequest({ notes_private: 'legacy' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(currentClient().notes).toBe('legacy')
  })
})
