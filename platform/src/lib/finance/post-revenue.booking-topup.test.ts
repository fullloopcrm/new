import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * postPaymentRevenue() keyed every booking-linked payment's ledger entry on
 * the BOOKING (source='booking', source_id=bookingId) to unify dedup with
 * backfillRevenueFromBookings. That's correct for the first dollar received
 * on a booking, but a SECOND payment on the same booking -- a multi-
 * installment partial payment completing, or finance/mark-paid closing out a
 * partial booking's remaining balance in cash -- reused that exact same
 * already-claimed key. journalEntryExists() returned true, and the second
 * payment's real, actually-received money silently never posted to the
 * ledger at all. A client who paid $50 then $150 on a $200 job only ever
 * showed $50 of revenue in the books, forever.
 *
 * Fix: once a booking's first slot is claimed, subsequent payments on that
 * booking post under a distinct 'booking_topup' entry keyed on the PAYMENT's
 * own id (still idempotent per payment, still additive, never touches the
 * first entry or the backfill's own dedup key).
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

const PAYMENTS: Record<string, Record<string, unknown>> = {}
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'payments') throw new Error(`unexpected table ${table}`)
      let idFilter: string | undefined
      const c: Record<string, unknown> = {
        select: () => c,
        eq: (col: string, val: unknown) => {
          if (col === 'id') idFilter = val as string
          return c
        },
        maybeSingle: async () => ({ data: idFilter ? PAYMENTS[idFilter] || null : null, error: null }),
      }
      return c
    },
  },
}))

import { postPaymentRevenue } from '@/lib/finance/post-revenue'

function sum(lines: Array<{ debit_cents?: number; credit_cents?: number }>, side: 'debit_cents' | 'credit_cents'): number {
  return lines.reduce((acc, l) => acc + (l[side] ?? 0), 0)
}

beforeEach(() => {
  h.reset()
  h.postJournalEntry.mockClear()
  h.journalEntryExists.mockClear()
  for (const k of Object.keys(PAYMENTS)) delete PAYMENTS[k]
})

describe('postPaymentRevenue — a second payment on an already-posted booking must still land in the ledger', () => {
  it('keys the first booking-linked payment on the booking itself', async () => {
    PAYMENTS['pay-1'] = { id: 'pay-1', amount_cents: 5000, tip_cents: 0, status: 'partial', method: 'zelle', booking_id: 'bk-1' }

    const res = await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-1' })

    expect(res.posted).toBe(true)
    expect(h.entries).toHaveLength(1)
    expect(h.entries[0].source).toBe('booking')
    expect(h.entries[0].source_id).toBe('bk-1')
    expect(sum(h.entries[0].lines, 'debit_cents')).toBe(5000)
  })

  it('posts a SECOND payment on the same booking as a booking_topup entry instead of silently dropping it', async () => {
    PAYMENTS['pay-1'] = { id: 'pay-1', amount_cents: 5000, tip_cents: 0, status: 'partial', method: 'zelle', booking_id: 'bk-1' }
    PAYMENTS['pay-2'] = { id: 'pay-2', amount_cents: 15000, tip_cents: 0, status: 'completed', method: 'manual', booking_id: 'bk-1' }

    const first = await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-1' })
    const second = await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-2' })

    expect(first.posted).toBe(true)
    expect(second.posted).toBe(true)
    expect(h.entries).toHaveLength(2)

    const topup = h.entries.find((e) => e.source === 'booking_topup')!
    expect(topup).toBeDefined()
    expect(topup.source_id).toBe('pay-2')
    // The second installment's OWN amount, not the cumulative total.
    expect(sum(topup.lines, 'debit_cents')).toBe(15000)

    // Total revenue actually posted across both entries = the full $200 the
    // client really paid, not just the $50 first installment.
    const totalPosted = h.entries.reduce((sum, e) => sum + e.lines.reduce((s, l) => s + (l.debit_cents ?? 0), 0), 0)
    expect(totalPosted).toBe(20000)
  })

  it('is idempotent — redelivering the same second payment does not post a duplicate topup', async () => {
    PAYMENTS['pay-1'] = { id: 'pay-1', amount_cents: 5000, tip_cents: 0, status: 'partial', method: 'zelle', booking_id: 'bk-1' }
    PAYMENTS['pay-2'] = { id: 'pay-2', amount_cents: 15000, tip_cents: 0, status: 'completed', method: 'manual', booking_id: 'bk-1' }

    await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-1' })
    await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-2' })
    const redelivered = await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-2' })

    expect(redelivered.posted).toBe(false)
    expect(redelivered.reason).toBe('already_posted')
    expect(h.entries).toHaveLength(2)
  })

  it('leaves invoice-only payments (no booking_id) keyed on the payment itself, unchanged', async () => {
    PAYMENTS['pay-invoice'] = { id: 'pay-invoice', amount_cents: 3000, tip_cents: 0, status: 'completed', method: 'manual', booking_id: null }

    const res = await postPaymentRevenue({ tenantId: 'tenant-A', paymentId: 'pay-invoice' })

    expect(res.posted).toBe(true)
    expect(h.entries[0].source).toBe('payment')
    expect(h.entries[0].source_id).toBe('pay-invoice')
  })
})
