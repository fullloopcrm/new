/**
 * Regression: a booking's labor cost hits the ledger exactly ONCE, whichever
 * path actually posts it.
 *
 * 'booking_cogs' (backfillRevenueFromBookings) is a FALLBACK accrual for
 * tenants with no other ledger-postable payout signal — confirmed live on
 * NYC Maid: team_member_payouts + payroll_payments both had ZERO rows across
 * 6 months and 629 paid jobs, because cleaners are paid manually off-platform
 * (Zelle/Venmo/cash) and only marked via the team_member_paid checkbox, which
 * posts nothing. Deleting the accrual outright (an earlier version of this
 * fix) would have zeroed out that tenant's entire labor expense going
 * forward — worse than the double-post bug it was meant to close.
 *
 * The real fix is conditional: 'booking_cogs' only posts when NO real payout
 * record exists yet for that booking (a team_member_payouts row keyed on
 * booking_id, or the booking's own status already flipped to 'paid' — which
 * only the Payroll POST route does, only after posting to the ledger). It
 * does NOT check team_member_paid, since that flag fires for the same
 * off-ledger manual path this accrual exists to cover.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { backfillRevenueFromBookings } from './post-revenue'
import { postPayrollToLedger, postPayoutToLedger } from './post-labor'

const A = 'tenant-A'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

function laborDebitTotal(tenantId: string): number {
  const laborCoaIds = new Set(
    (h.store.chart_of_accounts || [])
      .filter((c) => c.tenant_id === tenantId && (c.code === '5000' || c.code === '5010'))
      .map((c) => c.id),
  )
  return (h.store.journal_entry_lines || [])
    .filter((l) => laborCoaIds.has(l.coa_id))
    .reduce((sum, l) => sum + (Number(l.debit_cents) || 0), 0)
}

function seedBooking(id: string, fields: Record<string, unknown>) {
  h.store.bookings.push({
    id, tenant_id: A, team_member_id: 'tm_1',
    price: 20000, team_member_pay: 10000, tip_amount: 0,
    payment_status: 'paid', status: 'completed', start_time: '2026-07-21T00:00:00.000Z',
    ...fields,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    bookings: [], payroll_payments: [], team_member_payouts: [], hr_employee_profiles: [],
  }
  seedChart(A)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

it('DOES post booking_cogs when no real payout record exists (manually-paid tenant, e.g. NYC Maid)', async () => {
  seedBooking('bkg_manual', { id: 'bkg_manual' })
  // The only "paid" signal is the manual checkbox — no ledger record behind it.
  h.store.bookings[0].team_member_paid = true

  const r = await backfillRevenueFromBookings(A)
  expect(r.cogsPosted).toBe(1)
  expect(laborDebitTotal(A)).toBe(10000)
})

it('does NOT double-post when a team_member_payouts row already exists for the booking', async () => {
  seedBooking('bkg_stripe', { id: 'bkg_stripe' })
  h.store.team_member_payouts.push({
    id: 'po_1', tenant_id: A, booking_id: 'bkg_stripe', team_member_id: 'tm_1',
    amount_cents: 10000, tip_cents: 0, status: 'transferred',
  })
  await postPayoutToLedger({ tenantId: A, payoutId: 'po_1' })

  const r = await backfillRevenueFromBookings(A)
  expect(r.cogsPosted).toBe(0)
  expect(laborDebitTotal(A)).toBe(10000) // from the payout alone, not doubled
})

it('does NOT double-post when the booking is already marked status=paid by a real payroll run', async () => {
  seedBooking('bkg_payroll', { id: 'bkg_payroll' })
  h.store.payroll_payments.push({ id: 'pr_1', tenant_id: A, team_member_id: 'tm_1', amount: 10000 })
  await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_1' })
  // What the real Payroll POST route does once a payment covers what's owed.
  h.store.bookings[0].status = 'paid'

  const r = await backfillRevenueFromBookings(A)
  expect(r.cogsPosted).toBe(0)
  expect(laborDebitTotal(A)).toBe(10000) // from the payroll payment alone, not doubled
})

it('routes booking_cogs to 5010 (W-2 wages), not 5000, when the worker has an employee_w2 HR profile', async () => {
  h.store.hr_employee_profiles.push({ tenant_id: A, team_member_id: 'tm_1', employment_type: 'employee_w2' })
  seedBooking('bkg_w2', { id: 'bkg_w2' })

  await backfillRevenueFromBookings(A)
  const wagesCoa = (h.store.chart_of_accounts || []).find((c) => c.tenant_id === A && c.code === '5010')?.id
  const contractorCoa = (h.store.chart_of_accounts || []).find((c) => c.tenant_id === A && c.code === '5000')?.id
  const wagesDebit = (h.store.journal_entry_lines || []).filter((l) => l.coa_id === wagesCoa).reduce((s, l) => s + (Number(l.debit_cents) || 0), 0)
  const contractorDebit = (h.store.journal_entry_lines || []).filter((l) => l.coa_id === contractorCoa).reduce((s, l) => s + (Number(l.debit_cents) || 0), 0)
  expect(wagesDebit).toBe(10000)
  expect(contractorDebit).toBe(0)
})

it('is idempotent: running the backfill twice posts booking_cogs once', async () => {
  seedBooking('bkg_idem', { id: 'bkg_idem' })
  await backfillRevenueFromBookings(A)
  const second = await backfillRevenueFromBookings(A)
  expect(second.cogsPosted).toBe(0)
  expect(h.store.journal_entries.filter((e) => e.source === 'booking_cogs')).toHaveLength(1)
})
