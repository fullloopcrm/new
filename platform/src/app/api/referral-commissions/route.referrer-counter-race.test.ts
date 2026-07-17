/**
 * REFERRER COUNTER LOST-UPDATE RACE — total_earned (POST) / total_paid (PUT).
 *
 * The existing route.paid-race.test.ts proves the SAME commission can't be
 * double-credited by a double-submit (the status CAS handles that). This
 * file proves the separate, previously-unclosed gap: TWO DIFFERENT
 * commissions for the SAME referrer, created or paid concurrently, used to
 * race on a plain read-then-write of referrers.total_earned/total_paid —
 * both reads saw the same stale counter and the second write clobbered the
 * first, silently undercounting the referrer's ledger by one commission's
 * worth. Fixed via the bump_referrer_total_earned/total_paid atomic-increment
 * RPCs (2026_07_17_referrer_counter_atomic_bump.sql).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => ({ tenantId: currentTenantId }) }))
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpc = async (fn: string, params: Record<string, unknown>) => {
    if (fn !== 'bump_referrer_total_paid' && fn !== 'bump_referrer_total_earned') {
      throw new Error(`unexpected rpc: ${fn}`)
    }
    const col = fn === 'bump_referrer_total_paid' ? 'total_paid' : 'total_earned'
    const ref = fake._all('referrers').find(
      (r) => r.id === params.p_referrer_id && r.tenant_id === params.p_tenant_id,
    )
    if (ref) ref[col] = (Number(ref[col]) || 0) + Number(params.p_amount_cents)
    return { data: null, error: null }
  }
  return { supabaseAdmin: { ...fake, rpc } }
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn().mockResolvedValue({ posted: true }),
  postCommissionPayment: vi.fn().mockResolvedValue({ posted: true }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST, PUT } from './route'

const TENANT_ID = 'tenant-1'
const REFERRER_ID = 'ref-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function seedBooking(id: string, priceCents: number) {
  fake._seed('bookings', [
    { id, tenant_id: TENANT_ID, price: priceCents, referrer_id: REFERRER_ID, clients: { name: 'Client' } },
  ])
}

function seedCommission(id: string, bookingId: string, cents: number, status = 'pending') {
  fake._seed('referral_commissions', [
    { id, tenant_id: TENANT_ID, booking_id: bookingId, referrer_id: REFERRER_ID, commission_cents: cents, status, paid_at: null, paid_via: null },
  ])
}

function postCommission(bookingId: string) {
  const req = new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ booking_id: bookingId, referrer_id: REFERRER_ID }),
  })
  return POST(req)
}

function putPaid(id: string) {
  const req = new Request('http://x', {
    method: 'PUT',
    body: JSON.stringify({ id, status: 'paid' }),
  })
  return PUT(req)
}

beforeEach(() => {
  currentTenantId = TENANT_ID
  fake._store.clear()
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT_ID, name: 'Ref', email: null, commission_rate: 0.1, total_earned: 0, total_paid: 0 },
  ])
})

describe('POST /api/referral-commissions — total_earned counter race across DIFFERENT commissions', () => {
  it('two concurrent commission creations for the same referrer both credit total_earned (sum, not last-write-wins)', async () => {
    seedBooking('bk-a', 20_000)
    seedBooking('bk-b', 30_000)

    const [r1, r2] = await Promise.all([postCommission('bk-a'), postCommission('bk-b')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const ref = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    // 10% of 20_000 + 10% of 30_000 = 2_000 + 3_000 = 5_000
    expect(ref.total_earned).toBe(5_000)
  })
})

describe('PUT /api/referral-commissions — total_paid counter race across DIFFERENT commissions', () => {
  it('two concurrent paid-marks on DIFFERENT commissions for the same referrer both credit total_paid (sum, not last-write-wins)', async () => {
    seedCommission('comm-a', 'bk-a', 4_000)
    seedCommission('comm-b', 'bk-b', 6_000)

    const [r1, r2] = await Promise.all([putPaid('comm-a'), putPaid('comm-b')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const ref = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    expect(ref.total_paid).toBe(10_000)

    const commA = fake._all('referral_commissions').find((c) => c.id === 'comm-a')!
    const commB = fake._all('referral_commissions').find((c) => c.id === 'comm-b')!
    expect(commA.status).toBe('paid')
    expect(commB.status).toBe('paid')
  })
})
