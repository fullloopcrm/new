/**
 * Labor → ledger money-math (the other half of the money spine, see
 * money-adjustments.test.ts for the revenue half). Previously zero direct
 * coverage: postPayoutToLedger/postPayrollToLedger/backfillUnpostedLabor were
 * only ever mocked as no-ops in payment-processor consumer tests (see
 * payment-processor-payout-ledger-wiring.test.ts, which verifies the WIRING
 * calls postPayoutToLedger — not that the posting logic itself is correct).
 *
 * Run against the REAL post-labor.ts + ledger.ts, with a `post_journal_entry`
 * RPC emulated by the shared in-memory fake (writes the entry + its lines).
 *
 * Pinned:
 *   - Contractor payout   DR 5000 / CR 2450, balanced
 *   - W-2 payroll payment DR 5010 / CR 2450 (employment-type routing read
 *     from hr_employee_profiles — the single source of truth) — this is the
 *     one branch with real business logic (default 1099 vs W-2 override)
 *   - zero/negative amounts post nothing
 *   - idempotent by (source, source_id) so a webhook/backfill retry can't
 *     double-post
 *   - tip passthrough on a contractor payout adds to the debit (pass-through,
 *     nets against 4100 booked on the payment side)
 *   - backfillUnpostedLabor posts every unposted payout+payroll row and skips
 *     already-posted ones
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
// Import the fake BEFORE any module that pulls @/lib/supabase (e.g. ../ledger),
// so its binding is initialized before the hoisted vi.mock factory fires.
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postPayoutToLedger, postPayrollToLedger, backfillUnpostedLabor } from './post-labor'

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

function seedPayout(id: string, tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.team_member_payouts ||= []).push({ id, tenant_id: tenantId, status: 'paid', amount_cents: 0, tip_cents: 0, ...fields })
}

function seedPayroll(id: string, tenantId: string, fields: Record<string, unknown>) {
  ;(h.store.payroll_payments ||= []).push({ id, tenant_id: tenantId, status: 'paid', amount: 0, ...fields })
}

function seedHrProfile(tenantId: string, teamMemberId: string, employmentType: string) {
  ;(h.store.hr_employee_profiles ||= []).push({ tenant_id: tenantId, team_member_id: teamMemberId, employment_type: employmentType })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    team_member_payouts: [], payroll_payments: [], hr_employee_profiles: [],
  }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('postPayoutToLedger — contractor payout defaults to 1099 (5000)', () => {
  it('posts DR 5000 / CR 2450 for a paid payout with no HR profile on file, balanced', async () => {
    seedPayout('po_1', A, { team_member_id: 'tm_1', amount_cents: 20000 })
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'po_1' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['5000']).toEqual({ debit: 20000, credit: 0 })
    expect(byCode['2450']).toEqual({ debit: 0, credit: 20000 })
    expect(byCode['5010']).toBeUndefined()
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('adds the tip to the debit (pass-through, no separate tip line)', async () => {
    seedPayout('po_tip', A, { team_member_id: 'tm_1', amount_cents: 20000, tip_cents: 1500 })
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'po_tip' })
    expect(linesByCode(r.entryId!, A)['5000'].debit).toBe(21500)
  })

  it('ignores a negative tip (does not reduce the payout)', async () => {
    seedPayout('po_negtip', A, { team_member_id: 'tm_1', amount_cents: 20000, tip_cents: -500 })
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'po_negtip' })
    expect(linesByCode(r.entryId!, A)['5000'].debit).toBe(20000)
  })

  it('rejects a payout in a non-paid status (e.g. pending)', async () => {
    seedPayout('po_pending', A, { team_member_id: 'tm_1', amount_cents: 20000, status: 'pending' })
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'po_pending' })
    expect(r).toMatchObject({ posted: false, reason: 'status_pending' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('accepts every paid-equivalent status (transferred/paid/succeeded/completed)', async () => {
    for (const status of ['transferred', 'paid', 'succeeded', 'completed']) {
      seedPayout(`po_${status}`, A, { team_member_id: 'tm_1', amount_cents: 1000, status })
      const r = await postPayoutToLedger({ tenantId: A, payoutId: `po_${status}` })
      expect(r.posted).toBe(true)
    }
  })

  it('returns not_found for a payout id that does not exist', async () => {
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'nope' })
    expect(r).toMatchObject({ posted: false, reason: 'not_found' })
  })

  it('is idempotent by (payout, sourceId): a retry posts nothing new', async () => {
    seedPayout('po_dupe', A, { team_member_id: 'tm_1', amount_cents: 5000 })
    await postPayoutToLedger({ tenantId: A, payoutId: 'po_dupe' })
    const again = await postPayoutToLedger({ tenantId: A, payoutId: 'po_dupe' })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'payout')).toHaveLength(1)
  })
})

describe('postPayoutToLedger — W-2 employee routes to 5010, not 5000', () => {
  it('posts DR 5010 / CR 2450 when the team member has an employee_w2 HR profile', async () => {
    seedHrProfile(A, 'tm_w2', 'employee_w2')
    seedPayout('po_w2', A, { team_member_id: 'tm_w2', amount_cents: 30000 })
    const r = await postPayoutToLedger({ tenantId: A, payoutId: 'po_w2' })
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['5010']).toEqual({ debit: 30000, credit: 0 })
    expect(byCode['5000']).toBeUndefined()
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('does not leak a W-2 profile across tenants (same team_member_id, different tenant defaults to 1099)', async () => {
    seedHrProfile(A, 'tm_shared', 'employee_w2')
    seedPayout('po_b', B, { team_member_id: 'tm_shared', amount_cents: 10000 })
    const r = await postPayoutToLedger({ tenantId: B, payoutId: 'po_b' })
    const byCode = linesByCode(r.entryId!, B)
    expect(byCode['5000']).toEqual({ debit: 10000, credit: 0 })
    expect(byCode['5010']).toBeUndefined()
  })
})

describe('postPayrollToLedger — manual payroll payment', () => {
  it('posts DR 5010/5000 (by HR profile) / CR 2450 for the payroll amount, balanced', async () => {
    seedHrProfile(A, 'tm_w2', 'employee_w2')
    seedPayroll('pr_1', A, { team_member_id: 'tm_w2', amount: 45000 })
    const r = await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_1' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['5010']).toEqual({ debit: 45000, credit: 0 })
    expect(byCode['2450']).toEqual({ debit: 0, credit: 45000 })
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('refuses a zero/negative payroll amount', async () => {
    seedPayroll('pr_zero', A, { team_member_id: 'tm_1', amount: 0 })
    expect(await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_zero' })).toMatchObject({ posted: false, reason: 'zero_amount' })
    seedPayroll('pr_neg', A, { team_member_id: 'tm_1', amount: -1000 })
    expect(await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_neg' })).toMatchObject({ posted: false, reason: 'zero_amount' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('rejects a payroll payment in a non-paid status (e.g. pending) instead of posting it as already-paid', async () => {
    seedPayroll('pr_pending', A, { team_member_id: 'tm_1', amount: 20000, status: 'pending' })
    const r = await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_pending' })
    expect(r).toMatchObject({ posted: false, reason: 'status_pending' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('returns not_found for a payroll id that does not exist', async () => {
    expect(await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'nope' })).toMatchObject({ posted: false, reason: 'not_found' })
  })

  it('is idempotent by (payroll, sourceId)', async () => {
    seedPayroll('pr_dupe', A, { team_member_id: 'tm_1', amount: 5000 })
    await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_dupe' })
    const again = await postPayrollToLedger({ tenantId: A, payrollPaymentId: 'pr_dupe' })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'payroll')).toHaveLength(1)
  })
})

describe('backfillUnpostedLabor — safety net for both payouts and payroll', () => {
  it('posts every unposted paid payout + payroll row and skips already-posted ones', async () => {
    seedPayout('bf_po_1', A, { team_member_id: 'tm_1', amount_cents: 1000 })
    seedPayout('bf_po_2', A, { team_member_id: 'tm_1', amount_cents: 2000 })
    seedPayout('bf_po_pending', A, { team_member_id: 'tm_1', amount_cents: 3000, status: 'pending' }) // never posts (wrong status)
    seedPayroll('bf_pr_1', A, { team_member_id: 'tm_1', amount: 4000 })
    seedPayroll('bf_pr_pending', A, { team_member_id: 'tm_1', amount: 5000, status: 'pending' }) // never posts (wrong status)

    // Pre-post one payout so the backfill must skip it, not double-count.
    await postPayoutToLedger({ tenantId: A, payoutId: 'bf_po_1' })

    const result = await backfillUnpostedLabor(A)
    expect(result).toEqual({ payouts: 1, payroll: 1 }) // bf_po_2 + bf_pr_1; bf_po_1 already posted, bf_po_pending/bf_pr_pending wrong status

    expect(h.store.journal_entries.filter((e) => e.source === 'payout' && e.tenant_id === A)).toHaveLength(2) // bf_po_1 (pre) + bf_po_2 (backfill)
    expect(h.store.journal_entries.filter((e) => e.source === 'payroll' && e.tenant_id === A)).toHaveLength(1)
  })

  it('never touches another tenant\'s payouts/payroll', async () => {
    seedPayout('bf_b_po', B, { team_member_id: 'tm_1', amount_cents: 9000 })
    seedPayroll('bf_b_pr', B, { team_member_id: 'tm_1', amount: 9500 })

    const result = await backfillUnpostedLabor(A)
    expect(result).toEqual({ payouts: 0, payroll: 0 })
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B)).toHaveLength(0)
  })
})
