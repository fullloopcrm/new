/**
 * client_properties "set as primary" double-primary race.
 *
 * setPrimaryProperty() used to demote every property for a client to
 * is_primary=false, THEN set the target property is_primary=true -- two
 * separate statements. Two concurrent "set as primary" calls for two
 * DIFFERENT properties on the same client could interleave into TWO
 * primaries (demote-then-set ordering) or, with a naive reorder, ZERO
 * primaries (each call's demote step stomps the other's just-set row) --
 * neither ordering of two statements closes it. Same race, same fix shape as
 * set_primary_client_contact (2026-07-16,
 * src/app/api/clients/[id]/contacts/route.race.test.ts).
 *
 * resolveProperty() has the same class of bug on the insert path: two
 * concurrent bookings resolving a brand-new client's first-ever address both
 * read an empty `existing` list, both compute isPrimary:true, and (before
 * this fix) both inserted is_primary:true rows directly.
 *
 * FIX: a single atomic Postgres function (`set_primary_client_property`,
 * migration 2026_07_18_set_primary_client_property.sql, file-only/not
 * applied) that sets is_primary = (id = target) for every row under that
 * client in ONE UPDATE statement. No window exists for a second concurrent
 * call to observe or interleave with a partial state.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const CLIENT_ID = 'client-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  /** Overridable per-test so the RPC-error path can be exercised without
   *  vi.resetModules() churn. Defaults to the real atomic behavior. */
  rpcShouldError: false,
}))

/** Faithful fake of the RPC: one synchronous pass over the store, matching the
 *  real function's single-statement atomicity (no other call can interleave
 *  partway through a synchronous JS function body). */
function setPrimaryClientProperty(store: FakeStoreHandle, args: Record<string, unknown>) {
  if (h.rpcShouldError) return { data: null, error: { message: 'boom' } }
  for (const row of store.store.client_properties ?? []) {
    if (row.tenant_id === args.p_tenant_id && row.client_id === args.p_client_id) {
      row.is_primary = row.id === args.p_property_id
    }
  }
  return { data: null, error: null }
}

vi.mock('./supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true, rpc: { set_primary_client_property: setPrimaryClientProperty } })
  return { supabaseAdmin: fake, supabase: fake }
})

import { setPrimaryProperty, resolveProperty } from './client-properties'

beforeEach(() => {
  h.seq = 0
  h.rpcShouldError = false
  h.store = {
    clients: [{ id: CLIENT_ID, tenant_id: TENANT_ID }],
    client_properties: [],
    property_changes: [],
  }
})

describe('setPrimaryProperty — double-primary race', () => {
  it('two concurrent set-primary calls for two DIFFERENT properties land exactly one primary, not two (and not zero)', async () => {
    h.store.client_properties = [
      { id: 'prop-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, address: '1 A St', is_primary: true, active: true },
      { id: 'prop-2', tenant_id: TENANT_ID, client_id: CLIENT_ID, address: '2 B St', is_primary: false, active: true },
    ]

    await Promise.all([
      setPrimaryProperty(CLIENT_ID, 'prop-1'),
      setPrimaryProperty(CLIENT_ID, 'prop-2'),
    ])

    const primaries = h.store.client_properties.filter((p) => p.is_primary === true)
    expect(primaries).toHaveLength(1)
  })

  it('a normal single set-primary call still works (no regression)', async () => {
    h.store.client_properties = [
      { id: 'prop-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, address: '1 A St', is_primary: true, active: true },
      { id: 'prop-2', tenant_id: TENANT_ID, client_id: CLIENT_ID, address: '2 B St', is_primary: false, active: true },
    ]

    await setPrimaryProperty(CLIENT_ID, 'prop-2')

    expect(h.store.client_properties.find((p) => p.id === 'prop-1')?.is_primary).toBe(false)
    expect(h.store.client_properties.find((p) => p.id === 'prop-2')?.is_primary).toBe(true)
  })

  it('throws when the RPC errors, instead of silently reporting success', async () => {
    h.rpcShouldError = true
    h.store.client_properties = [{ id: 'prop-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, address: '1 A St', is_primary: false, active: true }]

    await expect(setPrimaryProperty(CLIENT_ID, 'prop-1')).rejects.toThrow('boom')
  })
})

describe('resolveProperty — brand-new-client double-primary race', () => {
  it('two concurrent first-property resolves for the same new client land exactly one primary, not two', async () => {
    const [a, b] = await Promise.all([
      resolveProperty(CLIENT_ID, '1 Alpha St'),
      resolveProperty(CLIENT_ID, '2 Beta St'),
    ])

    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(h.store.client_properties).toHaveLength(2)
    const primaries = h.store.client_properties.filter((p) => p.is_primary === true)
    expect(primaries).toHaveLength(1)
  })

  it('a single first-property resolve is still marked primary (no regression)', async () => {
    const created = await resolveProperty(CLIENT_ID, '1 Alpha St')
    expect(created).not.toBeNull()
    expect(h.store.client_properties).toHaveLength(1)
    expect(h.store.client_properties[0].is_primary).toBe(true)
  })

  it('resolving a second address for a client that already has a primary does not promote it', async () => {
    await resolveProperty(CLIENT_ID, '1 Alpha St')
    await resolveProperty(CLIENT_ID, '2 Beta St')
    const primaries = h.store.client_properties.filter((p) => p.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].address).toBe('1 Alpha St')
  })
})
