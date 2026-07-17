import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/broadcast/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops an admin's broadcast
 * POST from reading/notifying against a booking or team roster that belongs
 * to a foreign tenant, even when the booking id is guessed correctly.
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
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: () => 'sms body' }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const A_BOOKING = 'bk-a'
const B_BOOKING = 'bk-b'
const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(bookingId: string): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify({ booking_id: bookingId }) })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('tenants', [
    { id: A_ID, name: 'Tenant A Co', telnyx_api_key: 'key-a', telnyx_phone: '+15550000001', resend_api_key: null, primary_color: null },
    { id: B_ID, name: 'Tenant B Co', telnyx_api_key: 'key-b', telnyx_phone: '+15550000002', resend_api_key: null, primary_color: null },
  ])
  fake._seed('bookings', [
    { id: A_BOOKING, tenant_id: A_ID, start_time: '2026-08-01T10:00:00.000Z', end_time: null, pay_rate: 45, service_type: 'Deep Clean', notes: 'A note', clients: { name: 'A Client', address: 'A Addr' } },
    { id: B_BOOKING, tenant_id: B_ID, start_time: '2026-08-02T10:00:00.000Z', end_time: null, pay_rate: 99, service_type: 'B Service', notes: 'B note', clients: { name: 'B Client', address: 'B Addr' } },
  ])
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, name: 'A Worker', phone: '+15551110001', email: 'a@x.com', status: 'active' },
    { id: 'tm-b', tenant_id: B_ID, name: 'B Worker', phone: '+15551110002', email: 'b@x.com', status: 'active' },
  ])
})

describe('bookings/broadcast POST — tenantDb isolation', () => {
  it("admin A broadcasting their own booking notifies only tenant A's roster (positive control)", async () => {
    const res = await POST(postReq(A_BOOKING))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.reports).toEqual([{ name: 'A Worker', sms: true, email: true, push: false }])
  })

  it("admin A CANNOT broadcast on tenant B's booking by guessing its id — 404, no cross-tenant read", async () => {
    const res = await POST(postReq(B_BOOKING))
    expect(res.status).toBe(404)
  })

  it("LEAK CONTROL: selecting bookings by id ALONE (no tenant_id filter) WOULD return tenant B's booking for B's id — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, address)')
      .eq('id', B_BOOKING)
      .maybeSingle()
    expect((data as { pay_rate: number }).pay_rate).toBe(99)
  })
})
