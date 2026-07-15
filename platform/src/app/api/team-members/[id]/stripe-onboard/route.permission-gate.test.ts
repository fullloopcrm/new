import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — team-members/[id]/stripe-onboard/route.ts GET.
 * GET called getTenantForRequest() directly with zero permission check, unlike
 * its own POST (gated on team.edit) and the sibling stripe-status GET (gated
 * on team.view). Any authenticated tenant member — including a role with
 * team.view revoked via the tenant's RBAC customization — could read another
 * team member's live Stripe Connect status (connected/charges_enabled/
 * payouts_enabled/details_submitted). Proves GET now requires team.view and
 * short-circuits when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

// Bypassed-permission-check regression: a caller with a merely-authenticated
// session (no team.view) must still be blocked, so getTenantForRequest is
// mocked to always succeed — proving the block comes from requirePermission,
// not from auth failing incidentally.
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: async () => ({ tenantId: 'tenant-A', tenant: { id: 'tenant-A' }, role: 'staff', userId: 'u1' }),
  }
})

const retrieveMock = vi.fn(async (accountId: string) => ({
  id: accountId,
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
}))

vi.mock('stripe', () => {
  class FakeStripe {
    accounts = { retrieve: retrieveMock }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'staff', userId: 'u1' }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as stripeOnboardGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  fake._store.set('team_members', [
    { id: 'tm-1', tenant_id: TENANT_ID, stripe_account_id: 'acct_1' },
  ])
  permissionError = null
  retrieveMock.mockClear()
})

const params = Promise.resolve({ id: 'tm-1' })

describe('GET /api/team-members/[id]/stripe-onboard — team.view permission gate', () => {
  it('allowed with team.view, forbidden without', async () => {
    const ok = await stripeOnboardGET(new NextRequest('http://x/api/team-members/tm-1/stripe-onboard'), { params })
    expect(ok.status).not.toBe(403)
    expect(retrieveMock).toHaveBeenCalled()

    deny()
    retrieveMock.mockClear()
    const denied = await stripeOnboardGET(new NextRequest('http://x/api/team-members/tm-1/stripe-onboard'), { params })
    expect(denied.status).toBe(403)
    expect(retrieveMock).not.toHaveBeenCalled()
  })
})
