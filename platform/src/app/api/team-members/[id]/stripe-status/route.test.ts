import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST/GET /api/team-members/[id]/stripe-status — no host-resolved tenant
 * (getTenantFromHeaders() returns null, as it always does on the main
 * dashboard host that Stripe's return-URL redirect lands on) previously fell
 * back to looking the tenant up straight off the team_members row keyed by
 * the caller-supplied `id` path param — no proof required. That made every
 * downstream `.eq('tenant_id', ...)` check circular (derived from the very id
 * it should have been validating), so an unauthenticated caller could query
 * (and, on first success, mutate + trigger an admin notify/SMS for) ANY
 * tenant's team member's Stripe Connect status by guessing/knowing a UUID.
 * Fixed with a signed token (minted only by the authenticated /stripe-onboard
 * POST, bound to this exact tenant+team-member pair) required in that
 * fallback branch.
 */

process.env.ADMIN_TOKEN_SECRET = 'test_admin_secret'
process.env.STRIPE_SECRET_KEY = 'sk_test_x'

const TENANT_A = 'tenant-a'
const TEAM_MEMBER_A = 'tm-a'

const retrieveMock = vi.fn(async () => ({
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
  capabilities: { transfers: 'active' },
}))

vi.mock('stripe', () => {
  class MockStripe {
    accounts = { retrieve: retrieveMock }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/tenant-site', () => ({
  // Simulates the real behavior on the main dashboard host: no host-resolved
  // tenant, which is exactly when the vulnerable fallback used to trigger.
  getTenantFromHeaders: vi.fn(async () => null),
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              single: async () => ({
                data: val === TENANT_A ? { id: TENANT_A, stripe_api_key: null } : null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'team_members') {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          update: () => chain,
          single: async () => ({
            data: { id: TEAM_MEMBER_A, tenant_id: TENANT_A, name: 'Worker', stripe_account_id: 'acct_1', stripe_ready_at: null },
            error: null,
          }),
        }
        return chain
      }
      return { select: () => ({ eq: () => ({}) }) }
    },
  },
}))

import type { NextRequest } from 'next/server'
import { signOAuthState } from '@/lib/oauth-state'
import { POST, GET } from './route'

function makeReq(url: string): NextRequest {
  return { nextUrl: new URL(url) } as unknown as NextRequest
}

beforeEach(() => {
  retrieveMock.mockClear()
})

describe('POST /api/team-members/[id]/stripe-status', () => {
  it('rejects an unauthenticated request with no token (the previously-exploitable fallback)', async () => {
    const req = makeReq(`https://homeservicesbusinesscrm.com/api/team-members/${TEAM_MEMBER_A}/stripe-status`)
    const res = await POST(req, { params: Promise.resolve({ id: TEAM_MEMBER_A }) })
    expect(res.status).toBe(404)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('rejects a token minted for a different team member', async () => {
    const token = signOAuthState(`${TENANT_A}:some-other-team-member`)
    const req = makeReq(`https://homeservicesbusinesscrm.com/api/team-members/${TEAM_MEMBER_A}/stripe-status?t=${encodeURIComponent(token)}`)
    const res = await POST(req, { params: Promise.resolve({ id: TEAM_MEMBER_A }) })
    expect(res.status).toBe(404)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('rejects a forged token (wrong signature)', async () => {
    const forged = `${TENANT_A}:${TEAM_MEMBER_A}.${Date.now() + 60000}.deadbeef`
    const req = makeReq(`https://homeservicesbusinesscrm.com/api/team-members/${TEAM_MEMBER_A}/stripe-status?t=${encodeURIComponent(forged)}`)
    const res = await POST(req, { params: Promise.resolve({ id: TEAM_MEMBER_A }) })
    expect(res.status).toBe(404)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('accepts a valid token bound to this exact tenant + team member', async () => {
    const token = signOAuthState(`${TENANT_A}:${TEAM_MEMBER_A}`)
    const req = makeReq(`https://homeservicesbusinesscrm.com/api/team-members/${TEAM_MEMBER_A}/stripe-status?t=${encodeURIComponent(token)}`)
    const res = await POST(req, { params: Promise.resolve({ id: TEAM_MEMBER_A }) })
    expect(res.status).toBe(200)
    expect(retrieveMock).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/team-members/[id]/stripe-status', () => {
  it('rejects an unauthenticated request with no token', async () => {
    const req = makeReq(`https://homeservicesbusinesscrm.com/api/team-members/${TEAM_MEMBER_A}/stripe-status`)
    const res = await GET(req, { params: Promise.resolve({ id: TEAM_MEMBER_A }) })
    expect(res.status).toBe(404)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('accepts a valid token bound to this exact tenant + team member', async () => {
    const token = signOAuthState(`${TENANT_A}:${TEAM_MEMBER_A}`)
    const req = makeReq(`https://homeservicesbusinesscrm.com/api/team-members/${TEAM_MEMBER_A}/stripe-status?t=${encodeURIComponent(token)}`)
    const res = await GET(req, { params: Promise.resolve({ id: TEAM_MEMBER_A }) })
    expect(res.status).toBe(200)
  })
})
