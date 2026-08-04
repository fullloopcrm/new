import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — PATCH /api/admin/comhub/contacts/[id]/notes (tenantDb).
 *
 * The contact is looked up through tenantDb, and the note is written to its linked
 * client through tenantDb too — so a contact owned by another tenant 404s and the
 * client-notes write can never land on a foreign client. Probe both, and assert
 * tenant B's identically-id'd concern is untouched on the positive write.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => A) }))

import { PATCH } from './route'

function seed() {
  return {
    comhub_contacts: [
      { id: 'ct-a', tenant_id: A, client_id: 'cli-a' },
      { id: 'ct-b', tenant_id: B, client_id: 'cli-b' },
    ],
    clients: [
      { id: 'cli-a', tenant_id: A, notes_private: 'old A private', notes_public: 'old A public' },
      { id: 'cli-b', tenant_id: B, notes_private: 'old B private', notes_public: 'old B public' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
function patch(id: string, body: unknown) {
  return PATCH(new NextRequest('http://t/x', { method: 'PATCH', body: JSON.stringify(body) }), params(id))
}

describe('admin/comhub/contacts/[id]/notes PATCH — tenant isolation', () => {
  it("positive control: updates the caller-tenant's linked client notes only", async () => {
    const res = await patch('ct-a', { notes_private: 'new A private', notes_public: 'new A public' })
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_private).toBe('new A private')
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_public).toBe('new A public')
    // Tenant B's client is untouched.
    expect(h.seed.clients.find((c) => c.id === 'cli-b')!.notes_private).toBe('old B private')
    expect(h.seed.clients.find((c) => c.id === 'cli-b')!.notes_public).toBe('old B public')
  })

  it("wrong-tenant probe: a foreign contact 404s — no foreign client note is written", async () => {
    const res = await patch('ct-b', { notes_private: 'HACKED' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('contact not found')
    expect(h.seed.clients.find((c) => c.id === 'cli-b')!.notes_private).toBe('old B private')
  })
})

describe('admin/comhub/contacts/[id]/notes PATCH — explicit-null clear regression', () => {
  // Resolves by which key is PRESENT in the body, not by its value — an
  // explicit `{ notes_private: null }` must clear the field, not be skipped
  // because `null` is nullish too.
  it('clears notes_private when it is explicitly null, leaving notes_public untouched', async () => {
    const res = await patch('ct-a', { notes_private: null })
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_private).toBeNull()
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_public).toBe('old A public')
  })

  it('is a noop when no recognized key is present', async () => {
    const res = await patch('ct-a', {})
    expect((await res.json())).toEqual({ ok: true, noop: true })
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_private).toBe('old A private')
  })

  it('sets both notes_private and notes_public in one request', async () => {
    await patch('ct-a', { notes_private: 'p', notes_public: 'q' })
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_private).toBe('p')
    expect(h.seed.clients.find((c) => c.id === 'cli-a')!.notes_public).toBe('q')
  })
})
