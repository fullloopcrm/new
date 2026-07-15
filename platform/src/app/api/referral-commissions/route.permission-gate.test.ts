/**
 * REFERRAL-COMMISSIONS RBAC GATE — GET /api/referral-commissions (admin-session path).
 *
 * The admin-session branch (no `referrer_id` query param) used to resolve the
 * tenant via getTenantForRequest() alone with no RBAC check, so any
 * authenticated team member — including `staff`, which does not carry
 * `referrals.view` — could pull the full commissions ledger (client names,
 * booking prices, payout history) for the tenant. Fixed to gate on
 * requirePermission('referrals.view'), matching the sibling GET /api/referrals
 * route's read gate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn().mockResolvedValue({ posted: true }),
  postCommissionPayment: vi.fn().mockResolvedValue({ posted: true }),
}))

let currentRole: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'tenant-1', role: currentRole }),
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

const TENANT_ID = 'tenant-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function seed() {
  fake._store.clear()
  fake._seed('referral_commissions', [
    {
      id: 'comm-1',
      tenant_id: TENANT_ID,
      referrer_id: 'ref-1',
      commission_cents: 5_000,
      status: 'pending',
    },
  ])
}

function getAdminPath() {
  return GET(new Request('http://x/api/referral-commissions'))
}

beforeEach(() => {
  seed()
})

describe('referral-commissions GET — admin path RBAC gate', () => {
  it('staff (no referrals.view) is forbidden from the tenant-wide ledger', async () => {
    currentRole = 'staff'
    const res = await getAdminPath()
    expect(res.status).toBe(403)
  })

  it('manager (has referrals.view) can read the tenant-wide ledger', async () => {
    currentRole = 'manager'
    const res = await getAdminPath()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })

  it('owner can read the tenant-wide ledger', async () => {
    currentRole = 'owner'
    const res = await getAdminPath()
    expect(res.status).toBe(200)
  })
})
