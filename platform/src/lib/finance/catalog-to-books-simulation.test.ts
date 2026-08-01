/**
 * End-to-end simulation: catalog item → equipment purchase → depreciation →
 * booked/paid job (using that catalog item) → worker payout — asserting the
 * WHOLE ledger balances to the penny (Σdebits === Σcredits) and every
 * individual account lands on its exact expected balance.
 *
 * This is the "run a complete simulation, find the holes" check requested for
 * FullLoop's first real tenant onboarding. It runs the REAL posting modules
 * together (not each in isolation, which is how post-equipment-acquisition,
 * post-depreciation, post-revenue, and post-labor are otherwise covered) —
 * exactly the combination that caught the first bug fixed alongside this
 * test (equipment purchases never capitalized) and exercises the second
 * (booking labor cost double-posted via booking_cogs + a real payout) in its
 * realistic ordering: a Stripe Connect payout fires synchronously at
 * checkout, before the finance-post cron's revenue/booking_cogs backfill next
 * runs — so by the time that backfill sees the booking, the real payout
 * already exists and 'booking_cogs' correctly stays silent. See
 * booking-labor-single-post.test.ts for the other ordering (no real payout
 * exists yet — the manually-paid-tenant fallback case) and for the one
 * ordering this fix does NOT close (a lagging, partial manual payroll run).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postEquipmentAcquisition } from './post-equipment-acquisition'
import { postEquipmentDepreciationForTenant } from './post-depreciation'
import { backfillRevenueFromBookings } from './post-revenue'
import { postPayoutToLedger } from './post-labor'

const T = 'tenant-onboarding-sim'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

/** Net balance for one account code, signed debit-positive (Σdebit − Σcredit). */
function accountNet(tenantId: string, code: string): number {
  const coaId = (h.store.chart_of_accounts || []).find((c) => c.tenant_id === tenantId && c.code === code)?.id
  return (h.store.journal_entry_lines || [])
    .filter((l) => l.coa_id === coaId)
    .reduce((sum, l) => sum + (Number(l.debit_cents) || 0) - (Number(l.credit_cents) || 0), 0)
}

function grandTotals() {
  const debits = (h.store.journal_entry_lines || []).reduce((s, l) => s + (Number(l.debit_cents) || 0), 0)
  const credits = (h.store.journal_entry_lines || []).reduce((s, l) => s + (Number(l.credit_cents) || 0), 0)
  return { debits, credits }
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    equipment: [], bookings: [], payroll_payments: [], team_member_payouts: [], hr_employee_profiles: [],
    service_types: [],
  }
  seedChart(T)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

it('runs catalog → equipment → depreciation → paid job → Stripe Connect payout and balances to the penny', async () => {
  // 1. CATALOG — "House Cleaning" (service) + "10-Yard Dumpster" (equipment),
  // as an operator would create via /api/catalog. Catalog rows carry no GL
  // weight themselves (pricing/definitions aren't transactions) — they're the
  // upstream data the booking and equipment rows below reference.
  h.store.service_types.push(
    { id: 'svc_cleaning', tenant_id: T, name: 'House Cleaning', item_type: 'service', price_cents: 30000 },
    { id: 'svc_dumpster', tenant_id: T, name: '10-Yard Dumpster', item_type: 'equipment', price_cents: 45000 },
  )

  // 2. EQUIPMENT — buy a $6,000 dumpster, 60-month straight-line, no salvage,
  // tied to the equipment catalog item for billing.
  h.store.equipment.push({
    id: 'eq_dumpster', tenant_id: T, service_type_id: 'svc_dumpster', name: '10-Yard Dumpster #1',
    acquisition_cost_cents: 600000, acquisition_date: '2026-07-01', useful_life_months: 60,
    salvage_value_cents: 0, accumulated_depreciation_cents: 0, depreciation_method: 'straight_line', active: true,
  })
  const acq = await postEquipmentAcquisition({ tenantId: T, equipmentId: 'eq_dumpster' })
  expect(acq.posted).toBe(true)

  // 3. DEPRECIATION — one month, straight-line: $600,000 / 60 = $10,000.
  const dep = await postEquipmentDepreciationForTenant(T, '2026-07')
  expect(dep.posted).toEqual([{ equipmentId: 'eq_dumpster', name: '10-Yard Dumpster #1', amountCents: 10000 }])

  // 4. JOB — a $300 House Cleaning booking the customer already paid, worked
  // by a 1099 contractor owed $100 for the job (real per-job pay, computed at
  // checkout — see BookingsAdmin.tsx's computeCheckoutPricing).
  h.store.bookings.push({
    id: 'bkg_clean_1', tenant_id: T, team_member_id: 'tm_contractor',
    price: 30000, team_member_pay: 10000, tip_amount: 0,
    payment_status: 'paid', status: 'completed', start_time: '2026-07-15T00:00:00.000Z',
  })

  // 5. PAYOUT — Stripe Connect pays the contractor synchronously at checkout
  // (payment-processor.ts calls postPayoutToLedger right after claiming the
  // payout), before the finance-post cron next runs.
  h.store.team_member_payouts.push({
    id: 'po_1', tenant_id: T, booking_id: 'bkg_clean_1', team_member_id: 'tm_contractor',
    amount_cents: 10000, tip_cents: 0, status: 'transferred',
  })
  const payout = await postPayoutToLedger({ tenantId: T, payoutId: 'po_1' })
  expect(payout.posted).toBe(true)

  // 6. CRON — the finance-post safety net runs afterward: posts revenue, and
  // correctly finds the real payout already on file for this booking, so it
  // does NOT also accrue 'booking_cogs'.
  const rev = await backfillRevenueFromBookings(T)
  expect(rev).toEqual({ scanned: 1, revenuePosted: 1, cogsPosted: 0 })

  // ── THE BOOKS, TO THE PENNY ──────────────────────────────────────────────
  // Equipment capitalized at cost; one month depreciated off it.
  expect(accountNet(T, '1500')).toBe(600000)   // Equipment (asset, debit-normal)
  expect(accountNet(T, '2000')).toBe(-600000)  // Accounts Payable (liability, credit-normal)
  expect(accountNet(T, '5110')).toBe(10000)    // Depreciation Expense
  expect(accountNet(T, '1510')).toBe(-10000)   // Accumulated Depreciation (contra-asset, credit-normal)

  // Revenue recognized once.
  expect(accountNet(T, '1050')).toBe(30000)    // Undeposited Funds
  expect(accountNet(T, '4000')).toBe(-30000)   // Service Revenue

  // Labor posted exactly once, from the real payout — the regression this
  // whole simulation exists to prove: pre-fix this would have been posted
  // again as 'booking_cogs' for the same $100, doubling it to $200.
  expect(accountNet(T, '5000')).toBe(10000)    // Contractor Pay
  // Payouts in Transit stays credited $100 until the separate bank-withdrawal
  // match (not simulated here) moves it to the bank account — not simulating
  // that isn't a bug, it's simply the next step this test doesn't cover.
  expect(accountNet(T, '2450')).toBe(-10000)

  // Every individual journal entry is internally balanced (postJournalEntry
  // already throws on an unbalanced entry — this proves none of the posts
  // above snuck past that guard), AND the tenant's full ledger balances.
  const totals = grandTotals()
  expect(totals.debits).toBe(totals.credits)
  expect(totals.debits).toBe(600000 + 10000 + 30000 + 10000) // 650000 — every dollar once
})
