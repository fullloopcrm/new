import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (27), same fresh-ground fix as client-analytics/route.ts and
 * referrers/analytics/route.ts: 'paid' is a real bookings.status value that
 * POST /api/finance/payroll flips a booking to once the team member's wage
 * is paid out. This route's LTV/lifecycle query only ever matched
 * status === 'completed', so a client whose only booking got bulk-paid
 * vanished from this report entirely (zero LTV, not counted in
 * totalClients). Proves the fix.
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
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ active_client_threshold_days: 45, at_risk_threshold_days: 90 }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-paid-status'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  fake._seed('bookings', [
    {
      id: 'bk-paid',
      tenant_id: TENANT_ID,
      client_id: 'client-paid-out',
      status: 'paid',
      price: 15000,
      start_time: new Date().toISOString(),
      clients: { name: 'Paid Out Client' },
    },
  ])
})

describe('clients/analytics GET — a booking bulk payroll has flipped to "paid" still counts (item 27)', () => {
  it("a client whose only booking is 'paid' (not 'completed') still appears with real LTV, not $0 / dropped entirely", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.summary.totalClients).toBe(1)
    expect(body.summary.totalLtv).toBe(15000)
    const client = body.clients.find((c: { client_id: string }) => c.client_id === 'client-paid-out')
    expect(client).toBeDefined()
    expect(client.ltv).toBe(15000)
    expect(client.lifecycle).toBe('active')
  })
})
