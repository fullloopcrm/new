import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/bookings/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') stops a portal token from
 * one tenant from reading another tenant's same-client-id bookings, and that
 * POST always stamps the new booking + resolves service_type_id against the
 * AUTHENTICATED tenant (auth.tid), never a foreign tenant's row sharing the
 * same service_type_id.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ allow_same_day: true, min_days_ahead: 0 }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_CLIENT_ID = 'client-shared' // same client id row-collision across tenants
const SHARED_SVC_ID = 'svc-shared' // same service_type id row-collision across tenants
const fake = supabaseAdmin as unknown as FakeSupabase

function req(method = 'GET', body?: unknown): Request {
  return new Request('http://x/api/portal/bookings', {
    method,
    headers: { authorization: 'Bearer whatever' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: SHARED_CLIENT_ID, tid: A_ID }
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: A_ID, client_id: SHARED_CLIENT_ID, start_time: '2099-01-01' },
    { id: 'bk-b', tenant_id: B_ID, client_id: SHARED_CLIENT_ID, start_time: '2099-01-02' },
  ])
  fake._seed('service_types', [
    { id: SHARED_SVC_ID, tenant_id: A_ID, name: 'A Service', default_duration_hours: 2, default_hourly_rate: 5000 },
    { id: SHARED_SVC_ID, tenant_id: B_ID, name: 'B Service', default_duration_hours: 9, default_hourly_rate: 99999 },
  ])
})

describe('portal/bookings GET — tenantDb isolation', () => {
  it("tenant A's portal token lists ONLY tenant A's booking, despite the SAME client_id existing under tenant B", async () => {
    const res = await GET(req() as never)
    const body = await res.json()
    expect(body.bookings).toHaveLength(1)
    expect(body.bookings[0].id).toBe('bk-a')
  })
})

describe('portal/bookings POST — tenantDb isolation', () => {
  it("resolves service_type_id against the AUTHENTICATED tenant's row, never tenant B's same-id service type", async () => {
    const res = await POST(req('POST', { start_time: '2099-01-10', service_type_id: SHARED_SVC_ID }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.service_type).toBe('A Service')
    expect(body.booking.price).toBe(1_000_000) // A's rate (5000 * 2 * 100), never B's (99999 * 9 * 100)
  })

  it("stamps the new booking with the AUTHENTICATED tenant, and never mutates tenant B's rows", async () => {
    await POST(req('POST', { start_time: '2099-01-11' }))
    const bBookings = fake._all('bookings').filter((r) => r.tenant_id === B_ID)
    expect(bBookings).toHaveLength(1)
    expect(bBookings[0].id).toBe('bk-b')

    const aBookings = fake._all('bookings').filter((r) => r.tenant_id === A_ID)
    expect(aBookings).toHaveLength(2)
  })
})
