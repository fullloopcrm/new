/**
 * bumpReferrerTotal — CAS retry for referrers.total_earned/total_paid.
 *
 * Both columns are shown to the referrer as real money owed/paid
 * (src/app/referral/[code]/page.tsx: pendingAmount = total_earned -
 * total_paid). The routes that bump them used to do a plain
 * `update({ field: read + delta })` -- two commissions for the SAME
 * referrer created/paid concurrently (different bookings, so the
 * UNIQUE(booking_id) dedup on referral_commissions doesn't help) would both
 * read the same starting value and the second write would clobber the
 * first, silently undercounting what the referrer is owed. This suite
 * proves the CAS retry closes that race.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { bumpReferrerTotal, bumpReferrerTotalOrFlag } from './referrer-ledger'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const REFERRER_ID = 'referrer-1'

beforeEach(() => {
  fake._store.clear()
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT_ID, total_earned: 1000, total_paid: 0 },
  ])
})

describe('bumpReferrerTotal', () => {
  it('adds delta to the field for a single caller', async () => {
    const ok = await bumpReferrerTotal(TENANT_ID, REFERRER_ID, 'total_earned', 500)
    expect(ok).toBe(true)
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)
    expect(row?.total_earned).toBe(1500)
  })

  it('two concurrent bumps for the same referrer both land — no lost update', async () => {
    const results = await Promise.all([
      bumpReferrerTotal(TENANT_ID, REFERRER_ID, 'total_earned', 300),
      bumpReferrerTotal(TENANT_ID, REFERRER_ID, 'total_earned', 700),
    ])

    expect(results).toEqual([true, true])
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)
    // 1000 (seed) + 300 + 700 — a lost update would leave this at 1300 or 1700.
    expect(row?.total_earned).toBe(2000)
  })

  it('three concurrent bumps all land', async () => {
    const results = await Promise.all([
      bumpReferrerTotal(TENANT_ID, REFERRER_ID, 'total_paid', 100),
      bumpReferrerTotal(TENANT_ID, REFERRER_ID, 'total_paid', 200),
      bumpReferrerTotal(TENANT_ID, REFERRER_ID, 'total_paid', 400),
    ])

    expect(results).toEqual([true, true, true])
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)
    expect(row?.total_paid).toBe(700)
  })

  it('returns false without throwing when the referrer/tenant does not match', async () => {
    const ok = await bumpReferrerTotal('wrong-tenant', REFERRER_ID, 'total_earned', 500)
    expect(ok).toBe(false)
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)
    expect(row?.total_earned).toBe(1000)
  })
})

describe('bumpReferrerTotalOrFlag', () => {
  it('behaves like a normal bump on success -- no admin_tasks row', async () => {
    const ok = await bumpReferrerTotalOrFlag(TENANT_ID, REFERRER_ID, 'total_earned', 500, {
      relatedType: 'referral_commission',
      relatedId: 'commission-1',
    })
    expect(ok).toBe(true)
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)
    expect(row?.total_earned).toBe(1500)
    expect(fake._all('admin_tasks')).toHaveLength(0)
  })

  it('opens a high-priority admin_tasks row instead of silently dropping a failed bump', async () => {
    // Every 3 real call sites (referral-commissions create/mark-paid,
    // team-portal checkout) used to await/fire-and-forget the plain
    // bumpReferrerTotal with zero check -- a false return (retries
    // exhausted, or referrer/tenant mismatch as here) meant
    // referrers.total_earned silently never reflected a commission that HAD
    // already been saved. This proves the failure now leaves a trace.
    const ok = await bumpReferrerTotalOrFlag('wrong-tenant', REFERRER_ID, 'total_earned', 500, {
      relatedType: 'referral_commission',
      relatedId: 'commission-1',
      referrerName: 'Jane Referrer',
    })
    expect(ok).toBe(false)
    // The referrer's total is untouched -- exactly the silent-drift state
    // this fix must surface rather than leave invisible.
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)
    expect(row?.total_earned).toBe(1000)

    const tasks = fake._all('admin_tasks')
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      tenant_id: 'wrong-tenant',
      type: 'referrer_ledger_drift',
      priority: 'high',
      related_type: 'referral_commission',
      related_id: 'commission-1',
    })
    expect(tasks[0].title).toContain('Jane Referrer')
    expect(tasks[0].description).toContain('total_earned')
  })
})
