/**
 * Commission clawback on refund/cancel (audit/crm-completion-2026-08-12 fix).
 *
 * Before this, the only way a referral_commissions or sales_partner_commissions
 * row ever got status='void' was a manual admin PATCH (PUT
 * /api/referral-commissions, /api/sales-partner-commissions) — a booking that
 * got refunded, disputed, or cancelled left its commission accrued (DR 6045/CR
 * 2400 already on the books) or even paid out, with nothing to correct it.
 * voidCommissionsForBooking() is the fix, wired into the booking cancel
 * transition (POST /api/bookings/[id]/status) — see status/route.ts. The
 * Stripe refund/chargeback webhook trigger described in the same fix request
 * could NOT be wired: src/app/api/webhooks/stripe/route.ts is on the
 * fullloop-critical-lock.js PIN lock (payment code, added 2026-08-07) and
 * src/lib/selena/tools.ts (the other real-money refund call site) is under the
 * locked src/lib/selena/ directory — both blocked without Jeff's PIN. Only the
 * cancel-triggered path is tested/wired here.
 *
 * Run against the REAL post-adjustments.ts + ledger.ts against the shared
 * ledger-supabase-fake, same harness as post-adjustments.commissions.test.ts.
 *
 * Pinned:
 *   - a 'pending' commission with a posted accrual gets voided AND the accrual
 *     is reversed (DR 2400/CR 6045, balanced, distinct source so it never
 *     collides with the original accrual entry)
 *   - a 'pending' commission with NO posted accrual just gets voided — no
 *     ledger entry appears (nothing to reverse)
 *   - a 'paid' commission is NEVER touched (status stays 'paid', no ledger
 *     reversal) — instead a high-priority admin_tasks row opens, and calling
 *     again doesn't open a second one
 *   - an already-'void' commission is a pure no-op
 *   - referral_commissions and sales_partner_commissions on the SAME booking
 *     both get processed in one call, using distinct source keys so a
 *     reversal on one never collides with the other
 *   - tenant isolation: never touches another tenant's commissions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postCommissionAccrual, postSalesPartnerCommissionAccrual, voidCommissionsForBooking } from './post-adjustments'

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

function seedReferralCommission(id: string, tenantId: string, bookingId: string, fields: Record<string, unknown>) {
  ;(h.store.referral_commissions ||= []).push({ id, tenant_id: tenantId, booking_id: bookingId, commission_cents: 1000, status: 'pending', ...fields })
}

function seedSalesPartnerCommission(id: string, tenantId: string, bookingId: string, fields: Record<string, unknown>) {
  ;(h.store.sales_partner_commissions ||= []).push({ id, tenant_id: tenantId, booking_id: bookingId, commission_cents: 1000, status: 'pending', ...fields })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    referral_commissions: [], sales_partner_commissions: [], admin_tasks: [],
  }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('voidCommissionsForBooking — pending commission, accrual already posted', () => {
  it('voids the row and reverses the accrual (DR 2400/CR 6045), balanced', async () => {
    seedReferralCommission('c-1', A, 'bk-1', { commission_cents: 2500 })
    await postCommissionAccrual({ tenantId: A, commissionId: 'c-1' })

    const result = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-1', reason: 'the booking was cancelled' })
    expect(result).toEqual({ voided: 1, flagged: 0 })

    const row = h.store.referral_commissions.find((r) => r.id === 'c-1')
    expect(row?.status).toBe('void')

    const reversalEntry = h.store.journal_entries.find((e) => e.source === 'commission_void' && e.source_id === 'c-1')
    expect(reversalEntry).toBeTruthy()
    const byCode = linesByCode(reversalEntry!.id as string, A)
    expect(byCode['2400']).toEqual({ debit: 2500, credit: 0 })
    expect(byCode['6045']).toEqual({ debit: 0, credit: 2500 })
  })

  it('is idempotent — calling twice does not double-reverse', async () => {
    seedReferralCommission('c-dupe', A, 'bk-dupe', { commission_cents: 900 })
    await postCommissionAccrual({ tenantId: A, commissionId: 'c-dupe' })

    await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-dupe', reason: 'the booking was cancelled' })
    const second = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-dupe', reason: 'the booking was cancelled' })
    expect(second).toEqual({ voided: 0, flagged: 0 }) // already void — skipped, not re-voided

    expect(h.store.journal_entries.filter((e) => e.source === 'commission_void' && e.source_id === 'c-dupe')).toHaveLength(1)
  })
})

describe('voidCommissionsForBooking — pending commission, accrual never posted', () => {
  it('voids the row without creating any ledger entry (nothing to reverse)', async () => {
    seedReferralCommission('c-2', A, 'bk-2', { commission_cents: 1500 })
    // No postCommissionAccrual call — the accrual never made it to the ledger.

    const result = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-2', reason: 'the booking was cancelled' })
    expect(result).toEqual({ voided: 1, flagged: 0 })
    expect(h.store.referral_commissions.find((r) => r.id === 'c-2')?.status).toBe('void')
    expect(h.store.journal_entries.filter((e) => e.source_id === 'c-2')).toHaveLength(0)
  })
})

describe('voidCommissionsForBooking — already-paid commission', () => {
  it('never touches status or the ledger; opens a high-priority admin_tasks row instead', async () => {
    seedReferralCommission('c-paid', A, 'bk-paid', { status: 'paid', commission_cents: 4000 })

    const result = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-paid', reason: 'the booking was refunded' })
    expect(result).toEqual({ voided: 0, flagged: 1 })

    expect(h.store.referral_commissions.find((r) => r.id === 'c-paid')?.status).toBe('paid') // untouched — real money moved
    expect(h.store.journal_entries.filter((e) => e.source_id === 'c-paid')).toHaveLength(0) // no auto-reversal

    const tasks = h.store.admin_tasks.filter((t) => t.related_id === 'c-paid' && t.type === 'commission_clawback_review')
    expect(tasks).toHaveLength(1)
    expect(tasks[0].priority).toBe('high')
    expect(tasks[0].status).toBe('open')
  })

  it('does not open a second task on a repeat call for the same commission', async () => {
    seedReferralCommission('c-paid-2', A, 'bk-paid-2', { status: 'paid', commission_cents: 2000 })
    await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-paid-2', reason: 'the booking was refunded' })
    const second = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-paid-2', reason: 'a chargeback was filed for the booking' })
    expect(second).toEqual({ voided: 0, flagged: 1 }) // still reports "flagged" (it IS flagged) but doesn't duplicate

    const tasks = h.store.admin_tasks.filter((t) => t.related_id === 'c-paid-2')
    expect(tasks).toHaveLength(1)
  })
})

describe('voidCommissionsForBooking — already-void commission', () => {
  it('is a pure no-op', async () => {
    seedReferralCommission('c-void', A, 'bk-void', { status: 'void', commission_cents: 1000 })
    const result = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-void', reason: 'the booking was cancelled' })
    expect(result).toEqual({ voided: 0, flagged: 0 })
    expect(h.store.journal_entries).toHaveLength(0)
    expect(h.store.admin_tasks).toHaveLength(0)
  })
})

describe('voidCommissionsForBooking — referral + sales-partner commission stacked on the same booking', () => {
  it('voids and reverses both, using distinct source keys', async () => {
    seedReferralCommission('shared-ref', A, 'bk-shared', { commission_cents: 1000 })
    seedSalesPartnerCommission('shared-sp', A, 'bk-shared', { commission_cents: 2000 })
    await postCommissionAccrual({ tenantId: A, commissionId: 'shared-ref' })
    await postSalesPartnerCommissionAccrual({ tenantId: A, commissionId: 'shared-sp' })

    const result = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-shared', reason: 'the booking was cancelled' })
    expect(result).toEqual({ voided: 2, flagged: 0 })

    expect(h.store.referral_commissions.find((r) => r.id === 'shared-ref')?.status).toBe('void')
    expect(h.store.sales_partner_commissions.find((r) => r.id === 'shared-sp')?.status).toBe('void')

    const refReversal = h.store.journal_entries.find((e) => e.source === 'commission_void' && e.source_id === 'shared-ref')
    const spReversal = h.store.journal_entries.find((e) => e.source === 'sales_partner_commission_void' && e.source_id === 'shared-sp')
    expect(refReversal).toBeTruthy()
    expect(spReversal).toBeTruthy()
    expect(refReversal!.id).not.toBe(spReversal!.id)
  })
})

describe('voidCommissionsForBooking — tenant isolation', () => {
  it('never touches another tenant\'s commissions for the same booking id', async () => {
    seedReferralCommission('cross-tenant', B, 'bk-cross', { commission_cents: 500 })
    const result = await voidCommissionsForBooking({ tenantId: A, bookingId: 'bk-cross', reason: 'the booking was cancelled' })
    expect(result).toEqual({ voided: 0, flagged: 0 })
    expect(h.store.referral_commissions.find((r) => r.id === 'cross-tenant')?.status).toBe('pending')
  })
})
