import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/sales-partner-commissions with paid_via:'stripe_connect' — the
 * Connect-transfer payout path (mirrors lib/finance/cleaner-payout.ts's
 * claim-before-transfer design: the atomic status update IS the claim, a
 * failed transfer reverts it). Manual (Zelle/Apple Cash) payouts are
 * regression-covered to prove they still skip Stripe entirely.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const transfersCreate = vi.hoisted(() => vi.fn(async () => ({ id: 'tr_sp_1' })))
const postPaymentSpy = vi.hoisted(() => vi.fn(async () => ({ posted: true })))

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
vi.mock('@/lib/finance/post-adjustments', () => ({ postSalesPartnerCommissionPayment: postPaymentSpy }))
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ transfers: { create: transfersCreate } }),
}))

import { PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  transfersCreate.mockClear()
  postPaymentSpy.mockClear()
  h.store = {
    tenants: [{ id: 'tenant-A', stripe_api_key: null }],
    sales_partners: [
      { id: 'partner-1', tenant_id: 'tenant-A', name: 'Jane Doe', total_paid: 0, stripe_connect_account_id: 'acct_1', stripe_ready_at: '2026-07-01T00:00:00Z' },
      { id: 'partner-2', tenant_id: 'tenant-A', name: 'Not Ready', total_paid: 0, stripe_connect_account_id: null, stripe_ready_at: null },
    ],
    sales_partner_commissions: [
      { id: 'comm-1', tenant_id: 'tenant-A', sales_partner_id: 'partner-1', commission_cents: 5000, status: 'pending' },
      { id: 'comm-2', tenant_id: 'tenant-A', sales_partner_id: 'partner-2', commission_cents: 3000, status: 'pending' },
    ],
  }
})

describe('PUT /api/sales-partner-commissions — Stripe Connect transfer', () => {
  it('transfers the commission via Stripe when the partner is Connect-ready', async () => {
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid', paid_via: 'stripe_connect' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(transfersCreate).toHaveBeenCalledTimes(1)
    expect(transfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, destination: 'acct_1' }),
      expect.objectContaining({ idempotencyKey: 'sales-partner-commission:comm-1' }),
    )
    expect(body.status).toBe('paid')
    expect(body.stripe_transfer_id).toBe('tr_sp_1')

    const partner = h.store.sales_partners.find((p) => p.id === 'partner-1')
    expect(partner?.total_paid).toBe(5000)
    expect(postPaymentSpy).toHaveBeenCalledWith({ tenantId: 'tenant-A', commissionId: 'comm-1' })
  })

  it('rejects a Stripe payout for a partner who has not completed onboarding, without bumping total_paid', async () => {
    const res = await PUT(putReq({ id: 'comm-2', status: 'paid', paid_via: 'stripe_connect' }))
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.error).toMatch(/not completed/i)
    expect(transfersCreate).not.toHaveBeenCalled()

    const commission = h.store.sales_partner_commissions.find((c) => c.id === 'comm-2')
    expect(commission?.status).toBe('pending')
    const partner = h.store.sales_partners.find((p) => p.id === 'partner-2')
    expect(partner?.total_paid).toBe(0)
  })

  it('reverts the claim (status back to pending) when the Stripe transfer itself throws', async () => {
    transfersCreate.mockRejectedValueOnce(new Error('card_declined'))
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid', paid_via: 'stripe_connect' }))
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.error).toBe('card_declined')
    const commission = h.store.sales_partner_commissions.find((c) => c.id === 'comm-1')
    expect(commission?.status).toBe('pending')
    expect(commission?.paid_via).toBeNull()
    const partner = h.store.sales_partners.find((p) => p.id === 'partner-1')
    expect(partner?.total_paid).toBe(0)
  })

  it('a second PUT after a successful Stripe payout does not double-transfer (CAS blocks re-claim)', async () => {
    await PUT(putReq({ id: 'comm-1', status: 'paid', paid_via: 'stripe_connect' }))
    transfersCreate.mockClear()
    postPaymentSpy.mockClear()

    const res2 = await PUT(putReq({ id: 'comm-1', status: 'paid', paid_via: 'stripe_connect' }))
    const body2 = await res2.json()

    expect(transfersCreate).not.toHaveBeenCalled()
    expect(body2.status).toBe('paid')
    const partner = h.store.sales_partners.find((p) => p.id === 'partner-1')
    expect(partner?.total_paid).toBe(5000)
  })

  it('manual payout (no paid_via, or zelle) never touches Stripe', async () => {
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.paid_via).toBe('zelle')
    expect(transfersCreate).not.toHaveBeenCalled()
    const partner = h.store.sales_partners.find((p) => p.id === 'partner-1')
    expect(partner?.total_paid).toBe(5000)
  })
})
