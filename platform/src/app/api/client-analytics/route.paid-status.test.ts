import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (27), fresh ground outside the archetype: 'paid' is a real
 * bookings.status value — POST /api/finance/payroll flips a booking from
 * 'completed' to 'paid' once the assigned team member's wage has been paid
 * out (src/app/api/finance/payroll/route.ts:101). This route's "completed
 * bookings" query only ever matched status === 'completed', so the instant
 * payroll ran on a client's booking, that booking (and its price) vanished
 * from totalSpent/bookingCount/status classification — a client whose only
 * job got paid out looked like they'd never booked at all ('new'/$0 LTV
 * instead of 'active' with real spend). Proves the fix: a 'paid' booking
 * counts identically to a 'completed' one.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-paid-status'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  fake._seed('clients', [
    { id: 'client-paid-out', tenant_id: TENANT_ID, name: 'Paid Out Client', status: 'active', created_at: '2026-01-01T00:00:00.000Z' },
  ])
  fake._seed('bookings', [
    {
      id: 'bk-paid',
      tenant_id: TENANT_ID,
      client_id: 'client-paid-out',
      status: 'paid',
      price: 20000,
      start_time: new Date().toISOString(),
    },
  ])
})

describe('client-analytics GET — a booking bulk payroll has flipped to "paid" still counts (item 27)', () => {
  it("the client's only booking is 'paid', not 'completed' — it still shows real spend and 'active' status, not $0/'new'", async () => {
    const res = await GET()
    const body = await res.json()
    const client = body.allClients.find((c: { id: string }) => c.id === 'client-paid-out')
    expect(client).toBeDefined()
    expect(client.totalSpent).toBe(20000)
    expect(client.bookingCount).toBe(1)
    expect(client.status).toBe('active')
    expect(body.overview.totalRevenue).toBe(20000)
  })
})
