import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

/**
 * Orchestration tests for the sweep cadence: candidate discovery (bookings
 * with a recent payout row) and the guardrail path (no payout method on
 * file, or a failed transfer → flag an admin_tasks row instead of silently
 * doing nothing, and don't re-flag the same booking every 15-min tick).
 * sweepCleanerOutstanding's own Stripe-calling mechanics live in
 * cleaner-payout-sweep-executor.ts and are structurally the same as
 * checkout-payout.ts's already-tested payCleanerAtCheckout — mocked here to
 * isolate the orchestration logic under test.
 */

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> })) as unknown as FakeStoreHandle
const outstandingByBooking = vi.hoisted(() => ({ current: {} as Record<string, unknown[]> }))
const sweepMock = vi.hoisted(() => vi.fn())

// admin_tasks.status defaults to 'open' in Postgres (011_parity_with_nycmaid.sql)
// — the fake needs the same default so an insert that relies on it (matching
// production code) still matches a later `.eq('status', 'open')` dedupe read.
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h, { insertDefaults: { status: 'open' } }) }))
vi.mock('./cleaner-outstanding', () => ({
  computeCleanerOutstanding: vi.fn(async (_tenantId: string, bookingId: string) => outstandingByBooking.current[bookingId] || []),
}))
vi.mock('./cleaner-payout-sweep-executor', () => ({ sweepCleanerOutstanding: sweepMock }))

import { runCleanerPayoutSweepForTenant } from './cleaner-payout-sweep'

const solo = (overrides: Record<string, unknown> = {}) => ({
  cleanerId: 'tm-1', name: 'Sobeida', phone: null, isLead: true,
  stripeAccountId: null, globalPayoutsRecipientId: 'recip_1',
  totalDueCents: 11370, totalPaidCents: 9300, outstandingCents: 2070,
  ...overrides,
})

beforeEach(() => {
  h.seq = 0
  sweepMock.mockReset()
  sweepMock.mockResolvedValue('paid')
  h.store = {
    team_member_payouts: [
      { booking_id: 'book-1', tenant_id: 't1', created_at: new Date().toISOString() },
    ],
    bookings: [
      { id: 'book-1', tenant_id: 't1', clients: { name: 'Kim' } },
    ],
    admin_tasks: [],
  }
  outstandingByBooking.current = { 'book-1': [solo()] }
})

describe('runCleanerPayoutSweepForTenant — candidate discovery', () => {
  it('finds a booking via its recent team_member_payouts row and pays the outstanding balance', async () => {
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.paid).toBe(1)
    expect(sweepMock).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't1', bookingId: 'book-1', clientName: 'Kim' }))
  })

  it('does nothing when no tenant booking has a recent payout row', async () => {
    h.store.team_member_payouts = []
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.paid).toBe(0)
    expect(sweepMock).not.toHaveBeenCalled()
  })
})

describe('runCleanerPayoutSweepForTenant — no-payout-method guardrail', () => {
  it('flags an admin_tasks row when the cleaner has neither Global Payouts nor Stripe Connect on file, without ever calling the executor', async () => {
    outstandingByBooking.current = { 'book-1': [solo({ stripeAccountId: null, globalPayoutsRecipientId: null })] }
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.flagged).toBe(1)
    expect(result.paid).toBe(0)
    expect(sweepMock).not.toHaveBeenCalled()
    const task = h.store.admin_tasks[0]
    expect(task.type).toBe('payout_stranded')
    expect(task.related_id).toBe('book-1')
    expect(String(task.description)).toContain('$20.70')
  })

  it('does not create a second admin_tasks row on the next tick while one is still open', async () => {
    outstandingByBooking.current = { 'book-1': [solo({ stripeAccountId: null, globalPayoutsRecipientId: null })] }
    await runCleanerPayoutSweepForTenant('t1')
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.flagged).toBe(0) // already flagged, correctly skipped this tick
    expect(h.store.admin_tasks.length).toBe(1)
  })

  it('flags again once the prior task is resolved (status no longer open)', async () => {
    outstandingByBooking.current = { 'book-1': [solo({ stripeAccountId: null, globalPayoutsRecipientId: null })] }
    await runCleanerPayoutSweepForTenant('t1')
    h.store.admin_tasks[0].status = 'resolved'
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.flagged).toBe(1)
    expect(h.store.admin_tasks.length).toBe(2)
  })
})

describe('runCleanerPayoutSweepForTenant — nothing owed', () => {
  it('does nothing for a booking whose outstanding balance is already zero', async () => {
    outstandingByBooking.current = { 'book-1': [solo({ outstandingCents: 0 })] }
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.paid).toBe(0)
    expect(result.flagged).toBe(0)
    expect(sweepMock).not.toHaveBeenCalled()
    expect(h.store.admin_tasks.length).toBe(0)
  })
})

describe('runCleanerPayoutSweepForTenant — a failed transfer also gets flagged', () => {
  it('flags an admin_tasks row when sweepCleanerOutstanding reports failed', async () => {
    sweepMock.mockResolvedValueOnce('failed')
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.flagged).toBe(1)
    expect(result.paid).toBe(0)
  })

  it('does not flag when sweepCleanerOutstanding reports paid', async () => {
    sweepMock.mockResolvedValueOnce('paid')
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.paid).toBe(1)
    expect(result.flagged).toBe(0)
    expect(h.store.admin_tasks.length).toBe(0)
  })

  it("does not flag 'not_claimed' (a benign race with another concurrent claim, not a failure)", async () => {
    sweepMock.mockResolvedValueOnce('not_claimed')
    const result = await runCleanerPayoutSweepForTenant('t1')
    expect(result.paid).toBe(0)
    expect(result.flagged).toBe(0)
  })
})
