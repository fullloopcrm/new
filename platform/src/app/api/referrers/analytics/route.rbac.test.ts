import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/referrers/analytics checked only getTenantForRequest() (any
 * authenticated tenant member) with no requirePermission() call, even
 * though it returns referrer earnings/revenue data and the sibling
 * GET /api/referrals already gates on referrals.view. 'staff' has no
 * referrals.* permission and could still pull every referrer's
 * total_earned and click/booking analytics for the tenant.
 * Real rbac.ts hasPermission() drives the assertions below (tenant-query
 * is mocked only for role/tenantId; requirePermission and rbac are real).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

let currentRole = 'staff'

vi.mock('@/lib/supabase', () => {
  function chain() {
    const c: Record<string, unknown> = {
      select: () => c,
      eq: () => c,
      not: () => c,
      order: () => c,
      then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
        res({ data: [], error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: () => chain() } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: currentRole, tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

import { GET } from '@/app/api/referrers/analytics/route'

describe('GET /api/referrers/analytics — RBAC enforcement', () => {
  beforeEach(() => {
    currentRole = 'staff'
  })

  it('staff (no referrals.view) is forbidden from viewing referral analytics', async () => {
    currentRole = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('manager (has referrals.view) can view referral analytics', async () => {
    currentRole = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
