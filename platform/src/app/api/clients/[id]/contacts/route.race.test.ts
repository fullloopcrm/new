/**
 * POST /api/clients/[id]/contacts — "set as primary" double-primary race.
 *
 * The route used to demote every other contact to is_primary=false BEFORE
 * inserting the new (primary) contact. Two concurrent POSTs creating two
 * DIFFERENT contacts for the same client, both requesting is_primary=true,
 * could each run their own demote-then-insert independently and both land
 * primary=true -- worse, a naive "reorder to insert-then-demote" fix still
 * has a window: A-insert, B-insert, A-demote (demotes B), B-demote (demotes
 * A) leaves ZERO contacts primary, not just two. Neither ordering of two
 * separate statements can close this.
 *
 * FIX: a single atomic Postgres function (`set_primary_client_contact`,
 * migration 2026_07_16_set_primary_client_contact.sql, file-only/not
 * applied) that sets is_primary = (id = target) for every row under that
 * client in ONE UPDATE statement. No window exists for a second concurrent
 * call to observe or interleave with a partial state, so every call
 * deterministically leaves exactly one contact primary.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const CLIENT_ID = 'client-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Faithful fake of the RPC: one synchronous pass over the store, matching
 *  the real function's single-statement atomicity (no other call can
 *  interleave partway through a synchronous JS function body). */
function setPrimaryClientContact(store: FakeStoreHandle, args: Record<string, unknown>) {
  for (const row of store.store.client_contacts ?? []) {
    if (row.tenant_id === args.p_tenant_id && row.client_id === args.p_client_id) {
      row.is_primary = row.id === args.p_contact_id
    }
  }
  return { data: null, error: null }
}

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true, rpc: { set_primary_client_contact: setPrimaryClientContact } })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ normalizePhone: (p: string) => p }))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const post = (body: Record<string, unknown>) =>
  POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), params(CLIENT_ID))

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    clients: [{ id: CLIENT_ID, tenant_id: TENANT_ID }],
    client_contacts: [],
  }
})

describe('POST /api/clients/[id]/contacts — double-primary race', () => {
  it('two concurrent primary-contact creations land exactly one primary, not two (and not zero)', async () => {
    const [first, second] = await Promise.all([
      post({ name: 'Alice', phone: '2125550001', is_primary: true }),
      post({ name: 'Bob', phone: '2125550002', is_primary: true }),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.client_contacts).toHaveLength(2)
    const primaries = h.store.client_contacts.filter((c) => c.is_primary === true)
    expect(primaries).toHaveLength(1)
  })

  it('a normal single primary creation still works (no regression)', async () => {
    const res = await post({ name: 'Alice', phone: '2125550001', is_primary: true })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.is_primary).toBe(true)
    expect(h.store.client_contacts).toHaveLength(1)
    expect(h.store.client_contacts[0].is_primary).toBe(true)
  })

  it('creating a second primary contact demotes the existing one (non-race path)', async () => {
    await post({ name: 'Alice', phone: '2125550001', is_primary: true })
    const res = await post({ name: 'Bob', phone: '2125550002', is_primary: true })
    expect(res.status).toBe(200)
    const primaries = h.store.client_contacts.filter((c) => c.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].name).toBe('Bob')
  })

  it('creating a non-primary contact never touches an existing primary (no regression)', async () => {
    await post({ name: 'Alice', phone: '2125550001', is_primary: true })
    await post({ name: 'Bob', phone: '2125550002', is_primary: false })
    const primaries = h.store.client_contacts.filter((c) => c.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].name).toBe('Alice')
  })
})
