/**
 * PUT /api/sales-partner-commissions — the payout-routing lookup fails open
 * on an unchecked query error.
 *
 * `const { data: partnerForRouting } = await ...maybeSingle()` never looked
 * at `error`. On a transient DB error, `partnerForRouting` comes back null
 * exactly like "partner not found" -- `partnerReady` then silently defaults
 * to `false`, which (for a partner an admin never explicitly flagged
 * `stripe_ineligible`) falls into the "not ready AND not ineligible" branch
 * and gets rejected... but for a genuinely Connect-ready partner, a flaky
 * read would incorrectly treat them as not-ready and block/misroute a real
 * payout instead of surfacing the DB error. Fixed by checking `error`
 * explicitly and failing closed (500, no status change) instead of
 * guessing the partner's readiness.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const transfersCreate = vi.hoisted(() => vi.fn(async () => ({ id: 'tr_sp_1' })))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: 'tenant-A',
      tenant: { id: 'tenant-A' },
      role: 'owner',
    })),
  }
})
vi.mock('@/lib/sales-partner-portal-auth', () => ({ getSalesPartnerAuth: () => null }))
vi.mock('@/lib/finance/post-adjustments', () => ({ postSalesPartnerCommissionPayment: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ transfers: { create: transfersCreate } }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  transfersCreate.mockClear()
  h.store = {
    tenants: [{ id: 'tenant-A', stripe_api_key: null }],
    sales_partners: [
      { id: 'partner-1', tenant_id: 'tenant-A', name: 'Jane Doe', total_paid: 0, stripe_connect_account_id: 'acct_1', stripe_ready_at: '2026-07-01T00:00:00Z', stripe_ineligible: false },
    ],
    sales_partner_commissions: [
      { id: 'comm-1', tenant_id: 'tenant-A', sales_partner_id: 'partner-1', commission_cents: 5000, status: 'pending' },
    ],
  }
})

describe('PUT /api/sales-partner-commissions — partner-routing query error', () => {
  it('fails closed (500) instead of silently downgrading a Connect-ready partner to manual routing', async () => {
    // Intercept the routing lookup (`.from('sales_partners').select('stripe_ready_at, stripe_ineligible')...maybeSingle()`)
    // and hand back a DB error instead of the real row -- same class of
    // transient failure the unchecked code used to treat as "partner not
    // ready", which would have misrouted this ready partner to the
    // rejected/manual branch instead of surfacing the failure.
    const fakeSupabase = supabaseAdmin as unknown as {
      from: (table: string) => unknown
    }
    const originalFrom = fakeSupabase.from.bind(fakeSupabase)
    let salesPartnersCalls = 0
    fakeSupabase.from = ((table: string) => {
      if (table === 'sales_partners') {
        salesPartnersCalls++
        if (salesPartnersCalls === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: { message: 'connection reset by peer' } }),
                }),
              }),
            }),
          }
        }
      }
      return originalFrom(table)
    }) as typeof fakeSupabase.from

    const res = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/failed to verify partner payout routing/i)
    expect(transfersCreate).not.toHaveBeenCalled()
    const commission = h.store.sales_partner_commissions.find((c) => c.id === 'comm-1')
    expect(commission?.status).toBe('pending')
    const partner = h.store.sales_partners.find((p) => p.id === 'partner-1')
    expect(partner?.total_paid).toBe(0)
  })
})
