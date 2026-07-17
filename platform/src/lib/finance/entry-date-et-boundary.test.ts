/**
 * Ledger entry_date -- ET calendar day, not true-UTC day (P1/W1 fresh-ground).
 *
 * Every real-time posting site across the money spine (post-labor.ts,
 * post-revenue.ts, post-adjustments.ts) defaulted entry_date via
 * `new Date().toISOString().slice(0, 10)` -- the true-UTC calendar day.
 * entry_date is a date-only ledger column meant in the business's ET calendar
 * terms (same convention as invoices' due_date / quotes' valid_until /
 * treatments' application_date, all fixed elsewhere tonight). From
 * ~8pm-midnight ET (real UTC already rolled to tomorrow), a payout, payment,
 * deposit, refund, chargeback, or commission event posted TONIGHT landed in
 * TOMORROW's ledger day instead -- silently shifting which day's books
 * (P&L, trial balance, balance sheet) captured the money event, and there is
 * no downstream correction: entry_date is written once, at post time, and
 * never re-derived.
 *
 * Fixed via nowNaiveET().slice(0, 10), the established helper, at all 7 call
 * sites: postPayoutToLedger/postPayrollToLedger (labor), postPaymentRevenue
 * (revenue), postDepositToLedger/postRefundToLedger/postChargebackToLedger/
 * postCommissionAccrual/postCommissionPayment (adjustments).
 *
 * Same TZ=UTC + fake-timer evening-boundary technique as this session's other
 * day-boundary tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// Import the fake BEFORE any module that pulls @/lib/supabase (e.g. ../ledger),
// so its binding is initialized before the hoisted vi.mock factory fires.
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postPayoutToLedger, postPayrollToLedger } from './post-labor'
import { postPaymentRevenue } from './post-revenue'
import { postDepositToLedger, postRefundToLedger, postChargebackToLedger, postCommissionAccrual, postCommissionPayment } from './post-adjustments'

const A = 'tenant-A'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

function entryDate(entryId: string): string | undefined {
  return (h.store.journal_entries || []).find((e) => e.id === entryId)?.entry_date as string | undefined
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    team_member_payouts: [], payroll_payments: [], payments: [], referral_commissions: [],
  }
  seedChart(A)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('entry_date default -- ET calendar day, not true-UTC day (evening boundary)', () => {
  // 9pm EDT July 17 == 1am UTC July 18 -- UTC has already rolled to the 18th,
  // but it's still the 17th in ET.
  const NOW = new Date('2026-07-18T01:00:00.000Z')
  const realTZ = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'UTC'
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    if (realTZ === undefined) delete process.env.TZ
    else process.env.TZ = realTZ
    vi.useRealTimers()
  })

  it('postPayoutToLedger posts the real ET-today, not the already-rolled-over UTC day', async () => {
    ;(h.store.team_member_payouts ||= []).push({ id: 'po_1', tenant_id: A, status: 'paid', amount_cents: 20000, tip_cents: 0, team_member_id: 'tm_1' })
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'po_1' })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postPayrollToLedger posts the real ET-today, not the already-rolled-over UTC day', async () => {
    ;(h.store.payroll_payments ||= []).push({ id: 'pr_1', tenant_id: A, amount: 50000, team_member_id: 'tm_1' })
    const r = await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_1' })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postPaymentRevenue posts the real ET-today, not the already-rolled-over UTC day', async () => {
    ;(h.store.payments ||= []).push({ id: 'pay_1', tenant_id: A, amount_cents: 10000, tip_cents: 0, status: 'completed', method: 'stripe', booking_id: null })
    const r = await postPaymentRevenue({ tenantId: A, paymentId: 'pay_1' })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postDepositToLedger posts the real ET-today, not the already-rolled-over UTC day', async () => {
    const r = await postDepositToLedger({ tenantId: A, sourceId: 'quote-1', amountCents: 25000 })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postRefundToLedger posts the real ET-today, not the already-rolled-over UTC day', async () => {
    const r = await postRefundToLedger({ tenantId: A, sourceId: 're_1', amountCents: 5000 })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postChargebackToLedger posts the real ET-today, not the already-rolled-over UTC day', async () => {
    const r = await postChargebackToLedger({ tenantId: A, sourceId: 'dp_1', amountCents: 8000 })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postCommissionAccrual posts the real ET-today, not the already-rolled-over UTC day', async () => {
    ;(h.store.referral_commissions ||= []).push({ id: 'com_1', tenant_id: A, commission_cents: 1500, status: 'pending' })
    const r = await postCommissionAccrual({ tenantId: A, commissionId: 'com_1' })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })

  it('postCommissionPayment posts the real ET-today, not the already-rolled-over UTC day', async () => {
    ;(h.store.referral_commissions ||= []).push({ id: 'com_2', tenant_id: A, commission_cents: 1500, status: 'paid' })
    const r = await postCommissionPayment({ tenantId: A, commissionId: 'com_2' })
    expect(entryDate(r.entryId!)).toBe('2026-07-17')
  })
})
