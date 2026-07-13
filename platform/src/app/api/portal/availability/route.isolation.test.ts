import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/availability/route.ts (docs/adr/0004).
 * Proves a client-portal availability check for tenant A never treats tenant
 * B's booking on the same date/time as blocking tenant A's slot, even though
 * both tenants schedule bookings in the same 8am-6pm namespace.
 */

vi.hoisted(() => {
  process.env.PORTAL_SECRET = 'test-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { GET } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('bookings', [
    // Tenant B has the ENTIRE day booked solid — must not affect tenant A's slots.
    { tenant_id: B_ID, start_time: '2026-08-01T08:00:00', end_time: '2026-08-01T20:00:00', status: 'scheduled' },
    // Tenant A has only the 2pm slot booked.
    { tenant_id: A_ID, start_time: '2026-08-01T14:00:00', end_time: '2026-08-01T16:00:00', status: 'scheduled' },
  ])
})

function getReq(token: string, date: string): NextRequest {
  return new NextRequest(`http://x/api/portal/availability?date=${date}&duration=2`, {
    headers: { authorization: `Bearer ${token}` },
  })
}

describe('portal/availability GET — tenantDb isolation', () => {
  it("tenant A's 10am slot shows available, unaffected by tenant B's full-day booking on the same date (positive control)", async () => {
    const token = createToken('client-a', A_ID)
    const res = await GET(getReq(token, '2026-08-01'))
    const body = await res.json()
    const slot10am = body.slots.find((s: { time: string }) => s.time === '10:00 AM')
    expect(slot10am.available).toBe(true)
  })

  it("tenant A's 2pm slot shows unavailable due to tenant A's OWN booking, not tenant B's", async () => {
    const token = createToken('client-a', A_ID)
    const res = await GET(getReq(token, '2026-08-01'))
    const body = await res.json()
    const slot2pm = body.slots.find((s: { time: string }) => s.time === '2:00 PM')
    expect(slot2pm.available).toBe(false)
  })

  it("LEAK CONTROL: reading bookings by date range ALONE (no tenant_id filter) WOULD pull in tenant B's full-day booking — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('start_time, end_time')
      .gte('start_time', '2026-08-01T00:00:00')
      .lte('start_time', '2026-08-01T23:59:59')
    expect((data as { start_time: string }[]).length).toBe(2) // both tenants' bookings, unscoped
  })
})
