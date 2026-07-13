import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — referrers/analytics/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps the click feed,
 * referred-bookings revenue, and referrer roster scoped to the requesting
 * tenant, even when a foreign tenant has referral activity in the same window.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('lead_clicks', [
    { ref_code: 'AREF', action: 'book', session_id: 's-a1', lead_id: null, device: 'mobile', page: '/', created_at: '2026-07-10T00:00:00', tenant_id: A_ID },
    { ref_code: 'BREF', action: 'book', session_id: 's-b1', lead_id: null, device: 'mobile', page: '/', created_at: '2026-07-10T00:00:00', tenant_id: B_ID },
  ])
  fake._seed('bookings', [
    { id: 'a-booked', tenant_id: A_ID, status: 'completed', price: 100, referrer_id: 'ref-a' },
    { id: 'b-booked', tenant_id: B_ID, status: 'completed', price: 900, referrer_id: 'ref-b' },
  ])
  fake._seed('referrers', [
    { id: 'ref-a', tenant_id: A_ID, name: 'A Referrer', referral_code: 'AREF', total_earned: 10 },
    { id: 'ref-b', tenant_id: B_ID, name: 'B Referrer', referral_code: 'BREF', total_earned: 900 },
  ])
})

describe('referrers/analytics GET — tenantDb isolation', () => {
  it("tenant A's overview counts only its own clicks and referred revenue (positive control)", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.overview.totalClicks).toBe(1)
    expect(body.overview.referredRevenue).toBe(100)
  })

  it("tenant A's top-referrers list never includes tenant B's referrer or earnings", async () => {
    const res = await GET()
    const body = await res.json()
    const names = body.topReferrers.map((r: { name: string }) => r.name)
    expect(names).toContain('A Referrer')
    expect(names).not.toContain('B Referrer')
    const totalEarned = body.topReferrers.reduce((s: number, r: { earned: number }) => s + r.earned, 0)
    expect(totalEarned).toBe(10)
  })

  it("LEAK CONTROL: reading lead_clicks by ref_code presence ALONE (no tenant_id filter) WOULD include tenant B's click — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('lead_clicks') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('ref_code')
      .order('created_at', { ascending: false })
    expect((data as { ref_code: string }[]).length).toBe(2) // both tenants' clicks, unscoped
  })
})
