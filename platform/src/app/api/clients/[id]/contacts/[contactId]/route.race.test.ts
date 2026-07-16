/**
 * PUT /api/clients/[id]/contacts/[contactId] — "set as primary" double-primary
 * race (sibling of the POST route's fix in ../route.race.test.ts).
 *
 * Same underlying bug: two concurrent PUTs setting two DIFFERENT existing
 * contacts as primary used to be able to interleave into either two
 * primaries, or (with a naive reorder) zero primaries. FIX: route through
 * the same atomic `set_primary_client_contact` Postgres function (migration
 * 2026_07_16_set_primary_client_contact.sql, file-only/not applied) instead
 * of two separate statements.
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

import { PUT } from './route'

const params = (contactId: string) => ({ params: Promise.resolve({ id: CLIENT_ID, contactId }) })
const put = (contactId: string, body: Record<string, unknown>) =>
  PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }), params(contactId))

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    client_contacts: [
      { id: 'contact-A', tenant_id: TENANT_ID, client_id: CLIENT_ID, name: 'Alice', is_primary: true },
      { id: 'contact-B', tenant_id: TENANT_ID, client_id: CLIENT_ID, name: 'Bob', is_primary: false },
    ],
  }
})

describe('PUT /api/clients/[id]/contacts/[contactId] — double-primary race', () => {
  it('two concurrent "set as primary" requests for different contacts land exactly one primary (not zero, not two)', async () => {
    const [first, second] = await Promise.all([
      put('contact-A', { is_primary: true }),
      put('contact-B', { is_primary: true }),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const primaries = h.store.client_contacts.filter((c) => c.is_primary === true)
    expect(primaries).toHaveLength(1)
  })

  it('a normal single "set as primary" still demotes the prior primary (no regression)', async () => {
    const res = await put('contact-B', { is_primary: true })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.is_primary).toBe(true)
    const primaries = h.store.client_contacts.filter((c) => c.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].id).toBe('contact-B')
  })

  it('explicitly un-setting the current primary still applies directly (no regression)', async () => {
    const res = await put('contact-A', { is_primary: false })
    expect(res.status).toBe(200)
    expect(h.store.client_contacts.find((c) => c.id === 'contact-A')?.is_primary).toBe(false)
  })

  it('editing an unrelated field on the non-primary contact never touches is_primary (no regression)', async () => {
    const res = await put('contact-B', { name: 'Bobby' })
    expect(res.status).toBe(200)
    expect(h.store.client_contacts.find((c) => c.id === 'contact-A')?.is_primary).toBe(true)
    expect(h.store.client_contacts.find((c) => c.id === 'contact-B')?.is_primary).toBe(false)
    expect(h.store.client_contacts.find((c) => c.id === 'contact-B')?.name).toBe('Bobby')
  })
})
