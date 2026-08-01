/**
 * Regression: the payroll-lag netting fix (post-labor.ts's
 * alreadyAccruedViaBookingCogs) is worthless if the route that calls it races
 * against itself. Found by an independent adversarial re-check 2026-08-01:
 * this route used to fire-and-forget postPayrollToLedger (no await) and then
 * separately AWAIT a `bookings.update({status:'paid'})` for the same member's
 * bookings right after -- since postPayrollToLedger has several MORE
 * sequential round-trips before it ever queries bookings for netting (fetch
 * payroll_payments row, then bookings, then journalEntryExists per booking),
 * the single-query status-flip update would almost always land FIRST in
 * practice against a real network-latency Postgres connection. By the time
 * the netting query ran, the very booking being paid would already have
 * flipped to status='paid' and silently dropped out of the "pending,
 * status='completed'" set the netting sum is computed from -- netting would
 * compute $0 already-accrued, and the FULL amount would post again on top of
 * whatever booking_cogs had already recorded.
 *
 * IMPORTANT LIMITATION, disclosed rather than glossed over: this test does
 * NOT actually prove the race -- tried reverting the route's `await` back to
 * fire-and-forget and re-ran this exact test, and it still passed. This fake
 * harness resolves every query as an already-settled promise, so there is no
 * real timing difference between "awaited" and "fire-and-forget" for it to
 * distinguish; it cannot reproduce the wall-clock-latency ordering a real
 * network call to Postgres would have. The route fix (awaiting
 * postPayrollToLedger before the status-flip update) is correct BY REASONING
 * about real I/O timing (postPayrollToLedger's several sequential round-trips
 * vs. the update's one), not by a test that caught it failing beforehand.
 * What this test DOES prove: the netting logic itself produces the right
 * output end-to-end through the real route (not just in post-labor.test.ts's
 * isolation), and locks that behavior in as a permanent regression.
 *
 * Unlike route.test.ts, this file deliberately does NOT mock
 * @/lib/finance/post-labor -- the point is exercising the REAL posting logic
 * through the REAL route, not asserting a mock was called with the right args.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '@/lib/ledger'

const CTX_TENANT = 'tid-race'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(async () => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null })),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { POST } from './route'

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

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
    team_members: [], bookings: [], payroll_payments: [], hr_employee_profiles: [],
  }
  seedChart(CTX_TENANT)
  vi.clearAllMocks()
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

it('does not double-post through the real route: a booking already accrued via booking_cogs is netted out, even though the status-flip update races the ledger post', async () => {
  h.store.team_members.push({ id: 'tm-1', tenant_id: CTX_TENANT, pay_rate: 20 })
  // $40 owed for a 2-hour job -- already accrued via booking_cogs (the
  // finance-post cron fired before this admin got around to running payroll).
  h.store.bookings.push({
    id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed',
    check_in_time: '2026-07-01T09:00:00Z', check_out_time: '2026-07-01T11:00:00Z',
    team_member_pay: 4000, // what alreadyAccruedViaBookingCogs actually reads
  })
  h.store.journal_entries.push({ id: 'je-bc-1', tenant_id: CTX_TENANT, source: 'booking_cogs', source_id: 'bk-1' })
  h.store.journal_entry_lines.push(
    { entry_id: 'je-bc-1', tenant_id: CTX_TENANT, coa_id: `coa-${CTX_TENANT}-5000`, debit_cents: 4000, credit_cents: 0 },
    { entry_id: 'je-bc-1', tenant_id: CTX_TENANT, coa_id: `coa-${CTX_TENANT}-2450`, debit_cents: 0, credit_cents: 4000 },
  )

  const res = await POST(postReq({ team_member_id: 'tm-1', amount: 40 })) // full amount owed
  expect(res.status).toBe(201)
  const body = await res.json()

  // The booking still correctly flips to 'paid' -- that part always worked.
  expect(body.bookings_marked_paid).toBe(true)
  expect(h.store.bookings.find((b) => b.id === 'bk-1')?.status).toBe('paid')

  // The real regression: total labor expense across 5000/5010 must be
  // exactly $40 (the one real cost) -- not $80 (booking_cogs' $40 PLUS a
  // full, un-netted $40 payroll post because the race zeroed out the netting).
  expect(laborDebitTotal(CTX_TENANT)).toBe(4000)
  expect(h.store.journal_entries.filter((e) => e.source === 'payroll')).toHaveLength(0) // fully netted, nothing new to post
})
