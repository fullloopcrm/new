/**
 * Characterization tests for the commission-posting half of post-adjustments.ts
 * — previously the largest uncovered slice of the file's 52% statement
 * coverage. money-adjustments.test.ts covers deposit/refund/chargeback money
 * math; post-adjustments-race.test.ts covers the double-post race for
 * postCommissionAccrual/postCommissionPayment. Entirely untested before this
 * file: postSalesPartnerCommissionAccrual, postSalesPartnerCommissionPayment,
 * backfillUnpostedCommissions, and tenantFromPaymentIntent.
 *
 * Same REAL post-adjustments.ts + ledger.ts against the shared
 * ledger-supabase-fake (post_journal_entry RPC emulated) as money-adjustments.test.ts.
 *
 * Pins:
 *   - postCommissionAccrual/postCommissionPayment: not_found + zero_amount
 *     rejections (the race test only covers void + the race itself)
 *   - postSalesPartnerCommissionAccrual: DR 6045/CR 2400, balanced; void and
 *     not_found rejected; idempotent by (sales_partner_commission, id); uses a
 *     DISTINCT source key from a referral commission on the same id, so the
 *     two can stack instead of colliding
 *   - postSalesPartnerCommissionPayment: DR 2400/CR 1010, balanced; ensures
 *     the accrual exists first (posts it if missing) so the payable never
 *     goes negative; idempotent
 *   - backfillUnpostedCommissions: accrues every non-void referral_commissions
 *     row, posts payment only for status='paid' rows, skips already-posted
 *     ones, tenant-scoped
 *   - tenantFromPaymentIntent: resolves {tenantId, bookingId} from a matching
 *     payments row; null for an empty id, no match, or a match with no
 *     tenant_id
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import {
  postCommissionAccrual,
  postCommissionPayment,
  postSalesPartnerCommissionAccrual,
  postSalesPartnerCommissionPayment,
  backfillUnpostedCommissions,
  tenantFromPaymentIntent,
} from './post-adjustments'

const A = 'tenant-A'
const B = 'tenant-B'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

function linesByCode(entryId: string, tenantId: string) {
  const codeOf = (coaId: unknown) =>
    (h.store.chart_of_accounts || []).find((c) => c.id === coaId && c.tenant_id === tenantId)?.code as string
  const out: Record<string, { debit: number; credit: number }> = {}
  for (const l of (h.store.journal_entry_lines || []).filter((x) => x.entry_id === entryId)) {
    out[codeOf(l.coa_id)] = { debit: Number(l.debit_cents) || 0, credit: Number(l.credit_cents) || 0 }
  }
  return out
}

function isBalanced(entryId: string): boolean {
  const lines = (h.store.journal_entry_lines || []).filter((l) => l.entry_id === entryId)
  const d = lines.reduce((s, l) => s + Number(l.debit_cents), 0)
  const c = lines.reduce((s, l) => s + Number(l.credit_cents), 0)
  return d === c && d > 0
}

function seedReferralCommission(id: string, tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.referral_commissions ||= []).push({ id, tenant_id: tenantId, commission_cents: 1000, status: 'earned', created_at: '2026-07-01T00:00:00Z', ...fields })
}

function seedSalesPartnerCommission(id: string, tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.sales_partner_commissions ||= []).push({ id, tenant_id: tenantId, commission_cents: 1000, status: 'earned', ...fields })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    referral_commissions: [], sales_partner_commissions: [], payments: [],
  }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('postCommissionAccrual / postCommissionPayment — rejections not covered by the race suite', () => {
  it('returns not_found for a commission id that does not exist', async () => {
    expect(await postCommissionAccrual({ tenantId: A, commissionId: 'nope' })).toEqual({ posted: false, reason: 'not_found' })
  })

  it('refuses a zero/negative commission_cents', async () => {
    seedReferralCommission('c-zero', A, { commission_cents: 0 })
    expect(await postCommissionAccrual({ tenantId: A, commissionId: 'c-zero' })).toEqual({ posted: false, reason: 'zero_amount' })
  })

  it('postCommissionPayment returns not_found for a commission that does not exist', async () => {
    expect(await postCommissionPayment({ tenantId: A, commissionId: 'nope' })).toEqual({ posted: false, reason: 'not_found' })
  })

  it('postCommissionAccrual posts DR 6045 / CR 2400, balanced', async () => {
    seedReferralCommission('c-1', A, { commission_cents: 2500 })
    const r = await postCommissionAccrual({ tenantId: A, commissionId: 'c-1' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['6045']).toEqual({ debit: 2500, credit: 0 })
    expect(byCode['2400']).toEqual({ debit: 0, credit: 2500 })
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('postCommissionPayment posts DR 2400 / CR 1010, balanced, and auto-creates the accrual first', async () => {
    seedReferralCommission('c-2', A, { commission_cents: 1800, status: 'paid' })
    const r = await postCommissionPayment({ tenantId: A, commissionId: 'c-2' })
    expect(r.posted).toBe(true)
    const payByCode = linesByCode(r.entryId!, A)
    expect(payByCode['2400']).toEqual({ debit: 1800, credit: 0 })
    expect(payByCode['1010']).toEqual({ debit: 0, credit: 1800 })
    // The accrual it depends on was auto-posted too.
    expect(h.store.journal_entries.filter((e) => e.source === 'commission' && e.source_id === 'c-2')).toHaveLength(1)
  })
})

describe('postSalesPartnerCommissionAccrual', () => {
  it('posts DR 6045 / CR 2400, balanced', async () => {
    seedSalesPartnerCommission('sp-1', A, { commission_cents: 4000 })
    const r = await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'sp-1' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['6045']).toEqual({ debit: 4000, credit: 0 })
    expect(byCode['2400']).toEqual({ debit: 0, credit: 4000 })
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('does not accrue a voided sales partner commission', async () => {
    seedSalesPartnerCommission('sp-void', A, { status: 'void' })
    expect(await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'sp-void' })).toEqual({ posted: false, reason: 'void' })
  })

  it('returns not_found / zero_amount appropriately', async () => {
    expect(await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'nope' })).toEqual({ posted: false, reason: 'not_found' })
    seedSalesPartnerCommission('sp-zero', A, { commission_cents: 0 })
    expect(await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'sp-zero' })).toEqual({ posted: false, reason: 'zero_amount' })
  })

  it('is idempotent by (sales_partner_commission, id)', async () => {
    seedSalesPartnerCommission('sp-dupe', A, { commission_cents: 500 })
    await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'sp-dupe' })
    const again = await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'sp-dupe' })
    expect(again).toEqual({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'sales_partner_commission' && e.source_id === 'sp-dupe')).toHaveLength(1)
  })

  it('uses a distinct source key so a referral commission and a sales-partner commission with the SAME id can both post (they stack, not collide)', async () => {
    seedReferralCommission('shared-id', A, { commission_cents: 1000 })
    seedSalesPartnerCommission('shared-id', A, { commission_cents: 2000 })
    const referral = await postCommissionAccrual({ tenantId: A, commissionId: 'shared-id' })
    const salesPartner = await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'shared-id' })
    expect(referral.posted).toBe(true)
    expect(salesPartner.posted).toBe(true)
    expect(referral.entryId).not.toBe(salesPartner.entryId)
  })
})

describe('postSalesPartnerCommissionPayment', () => {
  it('posts DR 2400 / CR 1010 and auto-creates the accrual first', async () => {
    seedSalesPartnerCommission('sp-pay', A, { commission_cents: 3000 })
    const r = await postSalesPartnerCommissionPayment({ tenantId: A, commissionId: 'sp-pay' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['2400']).toEqual({ debit: 3000, credit: 0 })
    expect(byCode['1010']).toEqual({ debit: 0, credit: 3000 })
    expect(h.store.journal_entries.filter((e) => e.source === 'sales_partner_commission' && e.source_id === 'sp-pay')).toHaveLength(1)
  })

  it('returns not_found / zero_amount appropriately', async () => {
    expect(await postSalesPartnerCommissionPayment({ tenantId: A, commissionId: 'nope' })).toEqual({ posted: false, reason: 'not_found' })
    seedSalesPartnerCommission('sp-zero2', A, { commission_cents: 0 })
    expect(await postSalesPartnerCommissionPayment({ tenantId: A, commissionId: 'sp-zero2' })).toEqual({ posted: false, reason: 'zero_amount' })
  })

  it('is idempotent by (sales_partner_commission_paid, id)', async () => {
    seedSalesPartnerCommission('sp-dupe2', A, { commission_cents: 900 })
    await postSalesPartnerCommissionPayment({ tenantId: A, commissionId: 'sp-dupe2' })
    const again = await postSalesPartnerCommissionPayment({ tenantId: A, commissionId: 'sp-dupe2' })
    expect(again).toEqual({ posted: false, reason: 'already_posted' })
  })
})

describe('backfillUnpostedCommissions', () => {
  it('accrues every non-void commission and posts payment only for status=paid rows', async () => {
    seedReferralCommission('bf-earned', A, { commission_cents: 1000, status: 'earned' })
    seedReferralCommission('bf-paid', A, { commission_cents: 2000, status: 'paid' })
    seedReferralCommission('bf-void', A, { commission_cents: 3000, status: 'void' })

    const result = await backfillUnpostedCommissions(A)
    expect(result).toEqual({ accrued: 2, paid: 1 }) // bf-earned + bf-paid accrue; bf-void skipped; only bf-paid gets a payment

    expect(h.store.journal_entries.filter((e) => e.source === 'commission' && e.tenant_id === A)).toHaveLength(2)
    expect(h.store.journal_entries.filter((e) => e.source === 'commission_paid' && e.tenant_id === A)).toHaveLength(1)
  })

  it('skips a commission that was already posted (idempotent safety net)', async () => {
    seedReferralCommission('bf-already', A, { commission_cents: 500, status: 'earned' })
    await postCommissionAccrual({ tenantId: A, commissionId: 'bf-already' })

    const result = await backfillUnpostedCommissions(A)
    expect(result).toEqual({ accrued: 0, paid: 0 })
    expect(h.store.journal_entries.filter((e) => e.source === 'commission' && e.source_id === 'bf-already')).toHaveLength(1)
  })

  it('never touches another tenant\'s commissions', async () => {
    seedReferralCommission('bf-other', B, { commission_cents: 5000, status: 'paid' })
    const result = await backfillUnpostedCommissions(A)
    expect(result).toEqual({ accrued: 0, paid: 0 })
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B)).toHaveLength(0)
  })
})

describe('tenantFromPaymentIntent', () => {
  it('resolves {tenantId, bookingId} from a matching payment', async () => {
    ;(h.store.payments ||= []).push({ id: 'pay-1', tenant_id: A, booking_id: 'bk-1', stripe_payment_intent_id: 'pi_123' })
    const r = await tenantFromPaymentIntent('pi_123')
    expect(r).toEqual({ tenantId: A, bookingId: 'bk-1' })
  })

  it('bookingId is null when the payment has no booking_id', async () => {
    ;(h.store.payments ||= []).push({ id: 'pay-2', tenant_id: A, booking_id: null, stripe_payment_intent_id: 'pi_456' })
    const r = await tenantFromPaymentIntent('pi_456')
    expect(r).toEqual({ tenantId: A, bookingId: null })
  })

  it('returns null for an empty paymentIntentId (no query)', async () => {
    expect(await tenantFromPaymentIntent('')).toBeNull()
  })

  it('returns null when no payment matches', async () => {
    expect(await tenantFromPaymentIntent('pi_does_not_exist')).toBeNull()
  })
})
