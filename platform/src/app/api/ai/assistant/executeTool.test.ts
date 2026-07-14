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
    bookings: [{ id: 'book-A1', tenant_id: 'tenant-A', status: 'scheduled', notes: null }],
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
})
