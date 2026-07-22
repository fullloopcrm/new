import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * REFERRAL-COMMISSION CONNECT TRANSFER — PUT /api/referral-commissions.
 *
 * Marking a commission 'paid' moves real money via Stripe Connect whenever
 * the referrer has completed onboarding (stripe_ready_at set) — mandatory,
 * per leader/Jeff's 2026-07-22 product decision (CHANNEL.md 16:35): manual
 * Zelle/Apple Cash is no longer a live payout method once a referrer CAN
 * connect Stripe, matching cleaners (no manual fallback). A caller-supplied
 * paid_via no longer overrides this for a Connect-ready referrer.
 *
 * The one escape hatch (CHANNEL.md 16:55): a referrer explicitly flagged
 * stripe_ineligible_at (admin-only, PATCH /api/referrers/[id]) can still be
 * paid manually. A referrer who simply hasn't connected YET — and isn't
 * flagged ineligible — can no longer be marked paid at all; the PUT is
 * rejected so the admin has to actually resolve one of the two states.
 *
 * If the Stripe transfer itself fails, the commission must revert to its
 * prior status rather than being recorded "paid" with no funds actually sent.
 */

const transfersCreate = vi.fn(async (_params: Record<string, unknown>, _opts: Record<string, unknown>) => ({ id: 'tr_1' }))
let transferShouldFail = false

vi.mock('stripe', () => {
  class MockStripe {
    transfers = {
      create: async (...args: unknown[]) => {
        if (transferShouldFail) throw new Error('Stripe: destination account not ready')
        return transfersCreate(...(args as [Record<string, unknown>, Record<string, unknown>]))
      },
    }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpc = (fn: string, args: { p_tenant_id: string; p_referrer_id: string; p_amount_cents: number }) => {
    if (fn === 'increment_referrer_paid') {
      const ref = fake._all('referrers').find((r) => r.id === args.p_referrer_id && r.tenant_id === args.p_tenant_id)
      if (ref) ref.total_paid = (Number(ref.total_paid) || 0) + args.p_amount_cents
      return Promise.resolve({ data: { total_paid: ref?.total_paid ?? null }, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  }
  return { supabaseAdmin: Object.assign(fake, { rpc }) }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn().mockResolvedValue({ posted: true }),
  postCommissionPayment: vi.fn().mockResolvedValue({ posted: true }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_ID,
    role: 'owner',
    tenant: { id: TENANT_ID, stripe_api_key: null },
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-1'
const COMMISSION_ID = 'comm-1'
const CONNECTED_REFERRER_ID = 'ref-connected'
const UNCONNECTED_REFERRER_ID = 'ref-unconnected'
const INELIGIBLE_REFERRER_ID = 'ref-ineligible'
const COMMISSION_CENTS = 7_500
const fake = supabaseAdmin as unknown as FakeSupabase

function seed() {
  fake._store.clear()
  fake._seed('referral_commissions', [
    {
      id: COMMISSION_ID,
      tenant_id: TENANT_ID,
      referrer_id: CONNECTED_REFERRER_ID,
      commission_cents: COMMISSION_CENTS,
      status: 'pending',
      paid_at: null,
      paid_via: null,
    },
  ])
  fake._seed('referrers', [
    {
      id: CONNECTED_REFERRER_ID,
      tenant_id: TENANT_ID,
      name: 'Connie Connected',
      total_paid: 0,
      total_earned: COMMISSION_CENTS,
      stripe_connect_account_id: 'acct_ready',
      stripe_ready_at: '2026-01-01T00:00:00.000Z',
      stripe_ineligible_at: null,
    },
    {
      id: UNCONNECTED_REFERRER_ID,
      tenant_id: TENANT_ID,
      name: 'Uma Unconnected',
      total_paid: 0,
      total_earned: COMMISSION_CENTS,
      stripe_connect_account_id: null,
      stripe_ready_at: null,
      stripe_ineligible_at: null,
    },
    {
      id: INELIGIBLE_REFERRER_ID,
      tenant_id: TENANT_ID,
      name: 'Ivan Ineligible',
      total_paid: 0,
      total_earned: COMMISSION_CENTS,
      stripe_connect_account_id: null,
      stripe_ready_at: null,
      stripe_ineligible_at: '2026-01-01T00:00:00.000Z',
    },
  ])
}

function putPaid(body: Record<string, unknown>) {
  const req = new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
  return PUT(req)
}

beforeEach(() => {
  transfersCreate.mockClear()
  transferShouldFail = false
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  seed()
})

describe('referral-commissions PUT — Connect transfer for a stripe-ready referrer', () => {
  it('auto-transfers via Stripe Connect when paid_via is omitted and the referrer is ready', async () => {
    const res = await putPaid({ id: COMMISSION_ID, status: 'paid' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(transfersCreate).toHaveBeenCalledTimes(1)
    const [params] = transfersCreate.mock.calls[0]
    expect(params).toMatchObject({ amount: COMMISSION_CENTS, currency: 'usd', destination: 'acct_ready' })
    expect(json.paid_via).toBe('stripe_connect')

    const commission = fake._all('referral_commissions').find((r) => r.id === COMMISSION_ID)!
    expect(commission.status).toBe('paid')
    expect(commission.paid_via).toBe('stripe_connect')
    const ref = fake._all('referrers').find((r) => r.id === CONNECTED_REFERRER_ID)!
    expect(ref.total_paid).toBe(COMMISSION_CENTS)
  })

  it('passes a commission-scoped idempotencyKey to the transfer', async () => {
    await putPaid({ id: COMMISSION_ID, status: 'paid' })
    const [, opts] = transfersCreate.mock.calls[0]
    expect(opts).toMatchObject({ idempotencyKey: `referrer-commission-payout:${COMMISSION_ID}` })
  })

  it('reverts to pending and does not bump total_paid when the Stripe transfer fails', async () => {
    transferShouldFail = true
    const res = await putPaid({ id: COMMISSION_ID, status: 'paid' })

    expect(res.status).toBe(502)
    const commission = fake._all('referral_commissions').find((r) => r.id === COMMISSION_ID)!
    expect(commission.status).toBe('pending')
    expect(commission.paid_at).toBeNull()
    const ref = fake._all('referrers').find((r) => r.id === CONNECTED_REFERRER_ID)!
    expect(ref.total_paid).toBe(0)
  })

  it('an explicit manual paid_via (e.g. zelle) is IGNORED for a connected referrer -- Connect is mandatory, no manual override', async () => {
    const res = await putPaid({ id: COMMISSION_ID, status: 'paid', paid_via: 'zelle' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(transfersCreate).toHaveBeenCalledTimes(1)
    expect(json.paid_via).toBe('stripe_connect')
  })
})

describe('referral-commissions PUT — an unconnected, un-flagged referrer cannot be marked paid at all', () => {
  it('rejects with 409 instead of silently falling back to manual', async () => {
    fake._seed('referral_commissions', [
      {
        id: 'comm-unconnected',
        tenant_id: TENANT_ID,
        referrer_id: UNCONNECTED_REFERRER_ID,
        commission_cents: COMMISSION_CENTS,
        status: 'pending',
        paid_at: null,
        paid_via: null,
      },
    ])

    const res = await putPaid({ id: 'comm-unconnected', status: 'paid' })
    expect(res.status).toBe(409)
    expect(transfersCreate).not.toHaveBeenCalled()

    const commission = fake._all('referral_commissions').find((r) => r.id === 'comm-unconnected')!
    expect(commission.status).toBe('pending')
    const ref = fake._all('referrers').find((r) => r.id === UNCONNECTED_REFERRER_ID)!
    expect(ref.total_paid).toBe(0)
  })

  it('an explicit paid_via does not bypass the block either', async () => {
    fake._seed('referral_commissions', [
      {
        id: 'comm-unconnected-2',
        tenant_id: TENANT_ID,
        referrer_id: UNCONNECTED_REFERRER_ID,
        commission_cents: COMMISSION_CENTS,
        status: 'pending',
        paid_at: null,
        paid_via: null,
      },
    ])

    const res = await putPaid({ id: 'comm-unconnected-2', status: 'paid', paid_via: 'zelle' })
    expect(res.status).toBe(409)
    expect(transfersCreate).not.toHaveBeenCalled()
  })
})

describe('referral-commissions PUT — admin-flagged Stripe-ineligible referrer keeps the manual escape hatch', () => {
  it('records the manual payout without attempting a Stripe transfer', async () => {
    fake._seed('referral_commissions', [
      {
        id: 'comm-ineligible',
        tenant_id: TENANT_ID,
        referrer_id: INELIGIBLE_REFERRER_ID,
        commission_cents: COMMISSION_CENTS,
        status: 'pending',
        paid_at: null,
        paid_via: null,
      },
    ])

    const res = await putPaid({ id: 'comm-ineligible', status: 'paid' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(transfersCreate).not.toHaveBeenCalled()
    expect(json.paid_via).toBe('zelle')

    const ref = fake._all('referrers').find((r) => r.id === INELIGIBLE_REFERRER_ID)!
    expect(ref.total_paid).toBe(COMMISSION_CENTS)
  })
})
