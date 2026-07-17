import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * executeTool('update_client' | 'update_bookings') — mass-assignment regression.
 *
 * Same class of bug as src/app/api/ai/assistant/executeTool.test.ts (Selena):
 * this admin CRM-copilot chat executes tool calls with whatever JSON the model
 * returns for `updates`. The Anthropic tool `input_schema` only *documents*
 * the intended fields (name/email/phone/... for update_client, team_member_id/
 * status/... for update_bookings) — it wasn't enforced server side.
 *
 * `tenant_id` specifically can't be hijacked this way even without an allowlist
 * (tenantDb.update() always overrides it), but other undocumented columns on
 * these tables were fully writable by whatever the model returned:
 *   - clients.pin — the client-portal login PIN. An updates object containing
 *     `pin` would let a prompt-injected/hallucinating tool call set a client's
 *     portal PIN to an attacker-known value — an auth bypass.
 *   - bookings.client_id — reassigning a booking's owning client corrupts who
 *     gets billed/notified for it and who it shows up for in the portal.
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
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Old Name', pin: '1234' }],
    bookings: [{ id: 'book-A1', tenant_id: 'tenant-A', client_id: 'client-A1', status: 'scheduled', notes: null }],
    booking_team_members: [],
  }
})

describe("executeTool('update_client')", () => {
  it('updates an allowed field', async () => {
    await executeTool('tenant-A', 'update_client', { client_id: 'client-A1', updates: { name: 'New Name' } })
    expect(h.store.clients[0].name).toBe('New Name')
  })

  it('does not let updates set the client portal PIN', async () => {
    await executeTool('tenant-A', 'update_client', {
      client_id: 'client-A1',
      updates: { name: 'Hacked', pin: '0000' },
    })
    expect(h.store.clients[0].pin).toBe('1234')
    expect(h.store.clients[0].name).toBe('Hacked')
  })
})

describe("executeTool('update_bookings')", () => {
  it('updates an allowed field', async () => {
    await executeTool('tenant-A', 'update_bookings', {
      booking_ids: ['book-A1'],
      updates: { status: 'confirmed' },
      confirmed: true,
    })
    expect(h.store.bookings[0].status).toBe('confirmed')
  })

  it('does not let updates reassign a booking to a different client', async () => {
    await executeTool('tenant-A', 'update_bookings', {
      booking_ids: ['book-A1'],
      updates: { status: 'confirmed', client_id: 'client-B9' },
      confirmed: true,
    })
    expect(h.store.bookings[0].client_id).toBe('client-A1')
    expect(h.store.bookings[0].status).toBe('confirmed')
  })
})

describe("executeTool('update_bookings') — booking_team_members lead sync", () => {
  it('replaces the stale booking_team_members lead row on reassign', async () => {
    h.store.team_members = [{ id: 'tm-new', tenant_id: 'tenant-A', name: 'New Member' }]
    h.store.booking_team_members.push({ id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 })
    await executeTool('tenant-A', 'update_bookings', {
      booking_ids: ['book-A1'],
      updates: { team_member_id: 'tm-new' },
      confirmed: true,
    })
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-new')
    expect(leadRows[0].tenant_id).toBe('tenant-A')
  })

  it('unassigning (team_member_id: null) deletes the stale lead row without inserting a new one', async () => {
    h.store.booking_team_members.push({ id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 })
    await executeTool('tenant-A', 'update_bookings', {
      booking_ids: ['book-A1'],
      updates: { team_member_id: null },
      confirmed: true,
    })
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(0)
  })

  it('an update that never touches team_member_id leaves booking_team_members untouched', async () => {
    h.store.booking_team_members.push({ id: 'btm-1', tenant_id: 'tenant-A', booking_id: 'book-A1', team_member_id: 'tm-old', is_lead: true, position: 1 })
    await executeTool('tenant-A', 'update_bookings', {
      booking_ids: ['book-A1'],
      updates: { status: 'confirmed' },
      confirmed: true,
    })
    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-A1' && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe('tm-old')
  })
})
