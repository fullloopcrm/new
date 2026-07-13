import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/running-late/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') (combined with the existing
 * .eq('team_member_id')) stops a field-staff member from reporting/mutating
 * a booking that belongs to a foreign tenant, even when that booking id is
 * guessed correctly.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: async () => ({}), sendPushToClient: async () => ({}) }))
vi.mock('@/lib/sms-templates', () => ({
  smsRunningLateClient: () => 'client sms',
  smsRunningLateAdmin: () => 'admin sms',
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: 'tm-a', tid: A_ID, role: 'worker' }
  fake._seed('tenants', [
    { id: A_ID, name: 'Tenant A Co', owner_phone: null, phone: null, telnyx_api_key: null, telnyx_phone: null },
    { id: B_ID, name: 'Tenant B Co', owner_phone: null, phone: null, telnyx_api_key: null, telnyx_phone: null },
  ])
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: A_ID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', client_id: 'client-a', running_late_at: null, running_late_eta: null, clients: { name: 'A Client', phone: null }, team_members: { name: 'A Worker' } },
    { id: 'bk-b', tenant_id: B_ID, team_member_id: 'tm-b', start_time: '2026-08-02T10:00:00.000Z', client_id: 'client-b', running_late_at: null, running_late_eta: null, clients: { name: 'B Client', phone: null }, team_members: { name: 'B Worker' } },
  ])
})

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('team-portal/running-late POST — tenantDb isolation', () => {
  it("worker A reporting late on their OWN booking succeeds (positive control)", async () => {
    const res = await POST(postReq({ bookingId: 'bk-a', eta: 10 }))
    expect(res.status).toBe(200)
    const row = fake._all('bookings').find((r) => r.id === 'bk-a')!
    expect(row.running_late_eta).toBe(10)
  })

  it("worker A CANNOT report late on tenant B's booking by guessing its id — 404, B's row survives untouched", async () => {
    const res = await POST(postReq({ bookingId: 'bk-b', eta: 10 }))
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === 'bk-b')!
    expect(bRow.running_late_at).toBeNull()
    expect(bRow.running_late_eta).toBeNull()
  })

  it("LEAK CONTROL: updating bookings by id ALONE (no tenant_id filter) WOULD let worker A mark tenant B's booking late — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings')
      .update({ running_late_eta: 99 })
      .eq('id', 'bk-b')
      .select()
      .maybeSingle()
    expect((data as { running_late_eta: number } | null)?.running_late_eta).toBe(99)
  })
})
