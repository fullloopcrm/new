import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * CROSS-TENANT-FK-INJECTION — executeTool('create_booking' | 'update_bookings').
 *
 * Same class as P25/P30/P32 elsewhere in this codebase: an AI tool-call
 * argument (client_id / team_member_id), not a raw HTTP body field, reached a
 * write with zero ownership check. Every OTHER mutating tool in this file
 * (get_client_details, update_client) is implicitly tenant-scoped because
 * `db` is `tenantDb(tenantId)` — but `create_booking` inserted the caller's
 * `client_id`/`team_member_id` verbatim, and `update_bookings` wrote a
 * caller-supplied `team_member_id` into `updates` verbatim, before this fix.
 *
 * Effect: `query_bookings` (same file) embeds `clients(name)` and
 * `team_members!bookings_team_member_id_fkey(name)` off those exact columns
 * with no tenant filter on the embedded side — so pointing either FK at a
 * foreign tenant's row and then asking the copilot to list/query bookings
 * leaks that tenant's real client name or employee name back.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/anthropic-client', () => ({ anthropicFromStoredKey: vi.fn() }))

import { executeTool } from './route'

beforeEach(() => {
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Tenant A Client' },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Tenant B Client (victim)' },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Tenant A Employee' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Tenant B Employee (victim)' },
    ],
    bookings: [],
  }
})

describe("executeTool('create_booking') cross-tenant FK injection", () => {
  it('rejects a foreign-tenant client_id (no row written)', async () => {
    const result = JSON.parse(
      await executeTool('tenant-A', 'create_booking', {
        confirmed: true,
        client_id: 'client-B1',
        start_time: '2026-08-01T10:00:00',
      }),
    )
    expect(result.error).toBe('client not found')
    expect(h.store.bookings.length).toBe(0)
  })

  it('rejects a foreign-tenant team_member_id even with an own-tenant client_id', async () => {
    const result = JSON.parse(
      await executeTool('tenant-A', 'create_booking', {
        confirmed: true,
        client_id: 'client-A1',
        team_member_id: 'tm-B1',
        start_time: '2026-08-01T10:00:00',
      }),
    )
    expect(result.error).toBe('team member not found')
    expect(h.store.bookings.length).toBe(0)
  })

  it('CONTROL: same-tenant client_id + team_member_id still creates the booking', async () => {
    const result = JSON.parse(
      await executeTool('tenant-A', 'create_booking', {
        confirmed: true,
        client_id: 'client-A1',
        team_member_id: 'tm-A1',
        start_time: '2026-08-01T10:00:00',
      }),
    )
    expect(result.success).toBe(true)
    expect(h.store.bookings.length).toBe(1)
    expect(h.store.bookings[0].client_id).toBe('client-A1')
    expect(h.store.bookings[0].team_member_id).toBe('tm-A1')
    expect(h.store.bookings[0].tenant_id).toBe('tenant-A')
  })
})

describe("executeTool('update_bookings') cross-tenant FK injection", () => {
  beforeEach(() => {
    h.store.bookings = [{ id: 'book-A1', tenant_id: 'tenant-A', client_id: 'client-A1', team_member_id: null, status: 'scheduled' }]
  })

  it('rejects reassigning to a foreign-tenant team_member_id (booking left unchanged)', async () => {
    const result = JSON.parse(
      await executeTool('tenant-A', 'update_bookings', {
        confirmed: true,
        booking_ids: ['book-A1'],
        updates: { team_member_id: 'tm-B1' },
      }),
    )
    expect(result.error).toBe('team member not found')
    expect(h.store.bookings[0].team_member_id).toBeNull()
  })

  it('CONTROL: same-tenant team_member_id still updates the booking', async () => {
    const result = JSON.parse(
      await executeTool('tenant-A', 'update_bookings', {
        confirmed: true,
        booking_ids: ['book-A1'],
        updates: { team_member_id: 'tm-A1' },
      }),
    )
    expect(result.success).toBe(true)
    expect(h.store.bookings[0].team_member_id).toBe('tm-A1')
  })
})
