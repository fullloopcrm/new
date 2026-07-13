/**
 * REFERRAL-COMMISSION PAID RACE — PUT /api/referral-commissions.
 *
 * Marking a commission 'paid' bumps `referrers.total_paid` by
 * `commission_cents`. The old code always re-applied that bump on every PUT
 * with status:'paid', with no check that the commission wasn't already paid
 * — a double-click, a retried request, or two concurrent PUTs would
 * double-credit the referrer's total_paid even though the finance-ledger
 * side (postCommissionPayment) is separately idempotent.
 *
 * Fix: the status transition is claimed atomically (`.neq('status', 'paid')`
 * on the UPDATE) so only one of two concurrent/duplicate requests actually
 * flips status and bumps total_paid; the loser gets the already-paid row
 * back unchanged.
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
import { PUT } from './route'

const TENANT_ID = 'tenant-1'
const COMMISSION_ID = 'comm-1'
const REFERRER_ID = 'ref-1'
const COMMISSION_CENTS = 5_000
const fake = supabaseAdmin as unknown as FakeSupabase

function seed() {
  fake._store.clear()
  fake._seed('referral_commissions', [
    {
      id: COMMISSION_ID,
      tenant_id: TENANT_ID,
      referrer_id: REFERRER_ID,
      commission_cents: COMMISSION_CENTS,
      status: 'pending',
      paid_at: null,
      paid_via: null,
    },
  ])
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT_ID, total_paid: 0, total_earned: COMMISSION_CENTS },
  ])
}

function putPaid() {
  const req = new Request('http://x', {
    method: 'PUT',
    body: JSON.stringify({ id: COMMISSION_ID, status: 'paid' }),
  })
  return PUT(req)
}

beforeEach(() => {
  currentTenantId = TENANT_ID
  seed()
})

describe('referral-commissions PUT — paid race', () => {
  it('marking paid once bumps total_paid by exactly commission_cents', async () => {
    const res = await putPaid()
    expect(res.status).toBe(200)
    const ref = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    expect(ref.total_paid).toBe(COMMISSION_CENTS)
  })

  it('two concurrent PUTs marking paid only credit total_paid once', async () => {
    const [r1, r2] = await Promise.all([putPaid(), putPaid()])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const ref = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    expect(ref.total_paid).toBe(COMMISSION_CENTS)
    const commission = fake._all('referral_commissions').find((r) => r.id === COMMISSION_ID)!
    expect(commission.status).toBe('paid')
  })

  it('a sequential re-submit of an already-paid commission is a no-op', async () => {
    await putPaid()
    const second = await putPaid()
    expect(second.status).toBe(200)
    const ref = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    expect(ref.total_paid).toBe(COMMISSION_CENTS)
  })
})
