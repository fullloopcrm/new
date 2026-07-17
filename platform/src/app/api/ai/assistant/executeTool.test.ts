import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * executeTool('update_client' | 'update_bookings') — mass-assignment regression.
 *
 * Selena (the dashboard AI assistant) executes these tool calls with whatever
 * JSON the model returns for `updates`. The Anthropic tool `input_schema` only
 * *documents* the intended fields (name/email/phone/... for update_client,
 * team_member_id/status/... for update_bookings) — it isn't enforced server
 * side, and neither `clients` nor `bookings` rows were previously shielded from
 * an `updates` object that also happened to include `tenant_id`. Since these
 * writes go through the service_role client (RLS bypassed), an unallowed
 * `tenant_id` in `updates` would reassign the row to another tenant.
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
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Old Name', active: true }],
    bookings: [{ id: 'book-A1', tenant_id: 'tenant-A', status: 'scheduled', notes: null, team_member_id: 'tm-old' }],
    booking_team_members: [
      { id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 },
    ],
  }
})

describe("executeTool('update_client')", () => {
  it('updates an allowed field', async () => {
    await executeTool('update_client', { client_id: 'client-A1', updates: { name: 'New Name' } }, 'tenant-A')
    expect(h.store.clients[0].name).toBe('New Name')
  })

  it('strips a tenant_id in updates instead of reassigning the client to another tenant', async () => {
    await executeTool(
      'update_client',
      { client_id: 'client-A1', updates: { name: 'Hacked', tenant_id: 'tenant-B' } },
      'tenant-A'
    )
    expect(h.store.clients[0].tenant_id).toBe('tenant-A')
    expect(h.store.clients[0].name).toBe('Hacked')
  })
})

describe("executeTool('update_bookings')", () => {
  it('updates an allowed field', async () => {
    await executeTool(
      'update_bookings',
      { booking_ids: ['book-A1'], updates: { status: 'confirmed' }, confirmed: true },
      'tenant-A'
    )
    expect(h.store.bookings[0].status).toBe('confirmed')
  })

  it('strips a tenant_id in updates instead of reassigning the booking to another tenant', async () => {
    await executeTool(
      'update_bookings',
      { booking_ids: ['book-A1'], updates: { status: 'confirmed', tenant_id: 'tenant-B' }, confirmed: true },
      'tenant-A'
    )
    expect(h.store.bookings[0].tenant_id).toBe('tenant-A')
    expect(h.store.bookings[0].status).toBe('confirmed')
  })

  it('reassigning team_member_id via natural language also replaces the stale booking_team_members lead row', async () => {
    // GET /api/bookings/:id/team and closeout-summary both source the LEAD
    // from booking_team_members, not bookings.team_member_id. Selena's
    // update_bookings tool wrote straight to bookings.team_member_id with no
    // sync, so a Selena-driven reassignment left the admin Team panel and
    // payout attribution pointed at the OLD member.
    await executeTool(
      'update_bookings',
      { booking_ids: ['book-A1'], updates: { team_member_id: 'tm-new' }, confirmed: true },
      'tenant-A'
    )
    expect(h.store.bookings[0].team_member_id).toBe('tm-new')
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-new')
    expect(leadRows[0].tenant_id).toBe('tenant-A')
    expect(h.store.booking_team_members.find((r) => r.team_member_id === 'tm-old')).toBeUndefined()
  })
})
