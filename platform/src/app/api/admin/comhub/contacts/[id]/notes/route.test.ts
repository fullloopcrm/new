import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Regression (2026-08-03): this route used to write a single `clients.notes`
 * column that was never added by migration 009 (only notes_private/
 * notes_public exist) — every save 500'd. Worse, the body-key-precedence
 * fallback (`'notes' in body ? ... : 'notes_private' in body ? ...`) meant
 * that even a fixed single-column write would have silently dropped
 * notes_public, since the ComHub UI always sends both keys together and
 * 'notes_private' always won the precedence check first. Coverage here is
 * on the real contract: both columns are set independently, by whichever
 * keys are actually present in the body.
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
        { id: 'client-1', tenant_id: 'tenant-1', notes_private: 'original-private', notes_public: 'original-public' },
      ],
    }
  })

  it('clears notes_private when it is explicitly null, leaving notes_public untouched', async () => {
    const res = await PATCH(makeRequest({ notes_private: null }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    const json = await res.json()

    expect(json).toEqual({ ok: true })
    expect(currentClient().notes_private).toBeNull()
    expect(currentClient().notes_public).toBe('original-public')
  })

  it('sets notes_private to the provided string', async () => {
    await PATCH(makeRequest({ notes_private: 'hello' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(currentClient().notes_private).toBe('hello')
  })

  it('sets notes_public to the provided string', async () => {
    await PATCH(makeRequest({ notes_public: 'visible to client' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(currentClient().notes_public).toBe('visible to client')
    expect(currentClient().notes_private).toBe('original-private')
  })

  it('sets both columns in one request — the shape the ComHub UI actually sends', async () => {
    await PATCH(makeRequest({ notes_private: 'private update', notes_public: 'public update' }), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    expect(currentClient().notes_private).toBe('private update')
    expect(currentClient().notes_public).toBe('public update')
  })

  it('is a noop when no recognized key is present', async () => {
    const res = await PATCH(makeRequest({}), {
      params: Promise.resolve({ id: 'contact-1' }),
    })
    const json = await res.json()
    expect(json).toEqual({ ok: true, noop: true })
    expect(currentClient().notes_private).toBe('original-private')
    expect(currentClient().notes_public).toBe('original-public')
  })
})
