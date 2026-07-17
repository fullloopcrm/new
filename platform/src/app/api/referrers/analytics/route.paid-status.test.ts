import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (27), same fresh-ground fix as client-analytics/route.ts and
 * clients/analytics/route.ts: 'paid' is a real bookings.status value that
 * POST /api/finance/payroll flips a booking to once the team member's wage
 * is paid out. This route's completedReferredBookings count only ever
 * matched status === 'completed', so a referred booking that bulk payroll
 * had since paid out silently dropped out of "completed referred jobs" —
 * making a referrer's real conversion look worse than it was the instant
 * payroll ran on their referral. Proves the fix.
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

const TENANT_ID = 'tenant-paid-status'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  fake._seed('bookings', [
    { id: 'bk-paid', tenant_id: TENANT_ID, status: 'paid', price: 100, referrer_id: 'ref-a' },
  ])
  fake._seed('referrers', [
    { id: 'ref-a', tenant_id: TENANT_ID, name: 'A Referrer', referral_code: 'AREF', total_earned: 10 },
  ])
})

describe('referrers/analytics GET — a referred booking bulk payroll has flipped to "paid" still counts as completed (item 27)', () => {
  it("a referred booking with status 'paid' counts toward completedReferredBookings, not just 'completed'", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.overview.totalReferredBookings).toBe(1)
    expect(body.overview.completedReferredBookings).toBe(1)
  })
})
