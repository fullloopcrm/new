import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * backfillRevenueFromBookings() posted a partially-paid booking's FULL price
 * (+ tip) as both the Undeposited Funds debit and the Service Revenue credit
 * -- the same partial-payment blind spot already fixed in ar-aging/cash-flow/
 * summary/tax-export/dashboard, but missed here. Because this function
 * writes real, permanent journal entries (via the live cron/finance-post
 * job), it didn't just misreport a number on screen -- it put money the
 * client never sent into the general ledger forever. Fixed to post only
 * partial_payment_cents (the amount actually received) when payment_status
 * is 'partial'.
 */

const h = vi.hoisted(() => {
  const entries: Array<{
    tenant_id: string
    source: string
    source_id: string
    memo?: string
    lines: Array<{ coa_id: string; debit_cents?: number; credit_cents?: number; memo?: string }>
  }> = []
  const postedKeys = new Set<string>()
  return {
    entries,
    postedKeys,
    reset: () => { entries.length = 0; postedKeys.clear() },
    ensureChartAccounts: vi.fn(async () => {}),
    getAccountIdByCode: vi.fn(async (_tenantId: string, code: string) => `acct-${code}`),
    journalEntryExists: vi.fn(async (tenantId: string, source: string, sourceId: string) =>
      postedKeys.has(`${tenantId}|${source}|${sourceId}`)),
    postJournalEntry: vi.fn(async (opts: (typeof entries)[number]): Promise<string | null> => {
      entries.push(opts)
      postedKeys.add(`${opts.tenant_id}|${opts.source}|${opts.source_id}`)
      return `entry-${entries.length}`
    }),
  }
})

vi.mock('@/lib/ledger', () => ({
  ensureChartAccounts: h.ensureChartAccounts,
  getAccountIdByCode: h.getAccountIdByCode,
  journalEntryExists: h.journalEntryExists,
  postJournalEntry: h.postJournalEntry,
}))

let BOOKINGS: Array<Record<string, unknown>> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'bookings') throw new Error(`unexpected table ${table}`)
      const c: Record<string, unknown> = {
        select: () => c,
        eq: () => c,
        in: () => c,
        gt: () => c,
        order: () => c,
        range: async (start: number, end: number) => ({ data: BOOKINGS.slice(start, end + 1), error: null }),
      }
      return c
    },
  },
}))

import { backfillRevenueFromBookings } from '@/lib/finance/post-revenue'

function sum(lines: Array<{ debit_cents?: number; credit_cents?: number }>, side: 'debit_cents' | 'credit_cents'): number {
  return lines.reduce((acc, l) => acc + (l[side] ?? 0), 0)
}

beforeEach(() => {
  h.reset()
  h.postJournalEntry.mockClear()
  h.journalEntryExists.mockClear()
  BOOKINGS = []
})

describe('backfillRevenueFromBookings — a partial booking must post only what was actually received', () => {
  it('posts the full price for a fully-paid booking (unchanged behavior)', async () => {
    BOOKINGS = [
      { id: 'bk-paid', price: 10000, tip_amount: 1500, team_member_pay: 0, payment_status: 'paid', partial_payment_cents: null, start_time: '2026-03-01T10:00:00Z', entity_id: null },
    ]

    const res = await backfillRevenueFromBookings('tenant-A')

    expect(res.revenuePosted).toBe(1)
    const entry = h.entries.find((e) => e.source === 'booking' && e.source_id === 'bk-paid')!
    expect(sum(entry.lines, 'debit_cents')).toBe(11500) // price + tip
    const revenueLine = entry.lines.find((l) => l.memo === 'Service revenue')!
    expect(revenueLine.credit_cents).toBe(10000) // tip excluded from revenue
    const tipLine = entry.lines.find((l) => l.memo === 'Tip')
    expect(tipLine?.credit_cents).toBe(1500)
  })

  it('posts only partial_payment_cents — not the full price — for a partially-paid booking', async () => {
    // $200 job, only $50 actually received.
    BOOKINGS = [
      { id: 'bk-partial', price: 20000, tip_amount: 0, team_member_pay: 0, payment_status: 'partial', partial_payment_cents: 5000, start_time: '2026-03-04T10:00:00Z', entity_id: null },
    ]

    const res = await backfillRevenueFromBookings('tenant-A')

    expect(res.revenuePosted).toBe(1)
    const entry = h.entries.find((e) => e.source === 'booking' && e.source_id === 'bk-partial')!
    expect(sum(entry.lines, 'debit_cents')).toBe(5000)
    expect(sum(entry.lines, 'credit_cents')).toBe(5000)
    const revenueLine = entry.lines.find((l) => l.memo === 'Service revenue')!
    expect(revenueLine.credit_cents).toBe(5000)
    // Never touches the full $200 price.
    expect(sum(entry.lines, 'debit_cents')).not.toBe(20000)
  })

  it('does not post anything for a partial booking with no partial_payment_cents recorded', async () => {
    BOOKINGS = [
      { id: 'bk-partial-unknown', price: 20000, tip_amount: 0, team_member_pay: 0, payment_status: 'partial', partial_payment_cents: null, start_time: '2026-03-04T10:00:00Z', entity_id: null },
    ]

    const res = await backfillRevenueFromBookings('tenant-A')

    expect(res.revenuePosted).toBe(0)
    expect(h.entries.find((e) => e.source_id === 'bk-partial-unknown')).toBeUndefined()
  })
})
