/**
 * Cancelled-booking revenue reversal, wired into the real-time cancel path
 * (audit/crm-completion-2026-08-12 fix). reverseCancelledBookingRevenue()
 * existed and was fully correct but was NEVER called anywhere except once by
 * hand on 2026-07-27 — a cash job cancelled after its revenue posted just sat
 * wrong in the books forever. reverseBookingRevenueIfPosted() is the
 * booking-scoped version now called from POST /api/bookings/[id]/status on
 * every cancel transition (see status/route.ts), and
 * reverseCancelledBookingRevenue() (the tenant-wide safety-net scan) now
 * shares its per-booking logic so both agree on when a reversal is safe.
 *
 * Uses the shared ledger-supabase-fake for the REVERSAL post itself (goes
 * through the real postJournalEntry -> rpc('post_journal_entry') path, so
 * that half is exercised for real, same as every other finance test in this
 * suite). The ORIGINAL booking-revenue entry this function reads back via
 * `.from('journal_lines')` is seeded directly into h.store.journal_lines
 * instead of posted through postPaymentRevenue/backfillRevenueFromBookings —
 * the shared fake's rpc('post_journal_entry') mock writes posted lines into
 * h.store.journal_entry_lines (an internal-only key matching the OTHER
 * existing tests' `linesByCode` helper), not h.store.journal_lines (the real
 * table name this function's own `.from('journal_lines')` read queries) — a
 * pre-existing quirk of the shared fake nothing had exercised before this
 * file, since no prior test combined an RPC-posted entry with a
 * `.from('journal_lines')` read of it. Seeding directly is both the
 * workaround and a faithful model of production, where journal_lines is the
 * one real table regardless of how the row got there.
 *
 * Pinned:
 *   - a cancelled booking with posted revenue and no Stripe refund gets
 *     reversed: an equal-and-opposite 'booking_reversal' entry, balanced,
 *     debit/credit swapped from the original
 *   - idempotent — a second call is a no-op, doesn't double-reverse
 *   - a booking whose payment_status is 'refunded' is skipped — the
 *     charge.refunded webhook's postRefundToLedger already reversed it via a
 *     different source key, so reversing again here would double-count
 *   - a booking with no posted revenue at all is a no-op
 *   - reverseCancelledBookingRevenue (tenant-wide scan) only reverses
 *     bookings actually marked cancelled, skips a refunded one, and is
 *     tenant-scoped
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { reverseBookingRevenueIfPosted, reverseCancelledBookingRevenue } from './post-revenue'

const A = 'tenant-A'
const B = 'tenant-B'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

function coaId(tenantId: string, code: string): string {
  return (h.store.chart_of_accounts || []).find((c) => c.tenant_id === tenantId && c.code === code)?.id as string
}

/** Seed a booking's already-posted revenue entry directly into journal_entries
 * + journal_lines (the real table name), mirroring what
 * backfillRevenueFromBookings/postPaymentRevenue would have created in
 * production: DR 1050 (price) / CR 4000 (price). */
function seedPostedBookingRevenue(tenantId: string, bookingId: string, priceCents: number) {
  h.seq += 1
  const entryId = `je-orig-${h.seq}`
  ;(h.store.journal_entries ||= []).push({ id: entryId, tenant_id: tenantId, source: 'booking', source_id: bookingId })
  ;(h.store.journal_lines ||= []).push(
    { entry_id: entryId, tenant_id: tenantId, coa_id: coaId(tenantId, '1050'), debit_cents: priceCents, credit_cents: 0 },
    { entry_id: entryId, tenant_id: tenantId, coa_id: coaId(tenantId, '4000'), debit_cents: 0, credit_cents: priceCents },
  )
  return entryId
}

function seedBooking(tenantId: string, bookingId: string, fields: Record<string, unknown> = {}) {
  ;(h.store.bookings ||= []).push({ id: bookingId, tenant_id: tenantId, status: 'cancelled', payment_status: 'paid', ...fields })
}

function linesByCode(entryId: string, tenantId: string) {
  const codeOf = (id: unknown) => (h.store.chart_of_accounts || []).find((c) => c.id === id && c.tenant_id === tenantId)?.code as string
  const out: Record<string, { debit: number; credit: number }> = {}
  for (const l of (h.store.journal_entry_lines || []).filter((x) => x.entry_id === entryId)) {
    out[codeOf(l.coa_id)] = { debit: Number(l.debit_cents) || 0, credit: Number(l.credit_cents) || 0 }
  }
  return out
}

beforeEach(() => {
  h.seq = 0
  h.store = { chart_of_accounts: [], journal_entries: [], journal_entry_lines: [], journal_lines: [], bookings: [] }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('reverseBookingRevenueIfPosted — cash job cancelled, no Stripe refund', () => {
  it('reverses the posted revenue: equal-and-opposite, balanced', async () => {
    seedPostedBookingRevenue(A, 'bk-1', 12_000)
    seedBooking(A, 'bk-1', { payment_status: 'paid' })

    const result = await reverseBookingRevenueIfPosted(A, 'bk-1')
    expect(result.reversed).toBe(true)
    expect(result.reversedCents).toBe(12_000)

    const reversalEntry = h.store.journal_entries.find((e) => e.source === 'booking_reversal' && e.source_id === 'bk-1')
    expect(reversalEntry).toBeTruthy()
    const byCode = linesByCode(reversalEntry!.id as string, A)
    // Original was DR 1050 / CR 4000 -- reversal swaps to CR 1050 / DR 4000.
    expect(byCode['1050']).toEqual({ debit: 0, credit: 12_000 })
    expect(byCode['4000']).toEqual({ debit: 12_000, credit: 0 })
  })

  it('is idempotent -- a second call does not double-reverse', async () => {
    seedPostedBookingRevenue(A, 'bk-2', 5_000)
    seedBooking(A, 'bk-2')

    const first = await reverseBookingRevenueIfPosted(A, 'bk-2')
    expect(first.reversed).toBe(true)
    const second = await reverseBookingRevenueIfPosted(A, 'bk-2')
    expect(second).toEqual({ reversed: false, reason: 'already_reversed' })

    expect(h.store.journal_entries.filter((e) => e.source === 'booking_reversal' && e.source_id === 'bk-2')).toHaveLength(1)
  })
})

describe('reverseBookingRevenueIfPosted -- Stripe-refunded booking', () => {
  it('skips: the refund webhook already reversed this revenue via a different source key', async () => {
    seedPostedBookingRevenue(A, 'bk-refunded', 8_000)
    seedBooking(A, 'bk-refunded', { payment_status: 'refunded' })

    const result = await reverseBookingRevenueIfPosted(A, 'bk-refunded')
    expect(result).toEqual({ reversed: false, reason: 'refund_path_handled' })
    expect(h.store.journal_entries.filter((e) => e.source === 'booking_reversal')).toHaveLength(0)
  })
})

describe('reverseBookingRevenueIfPosted -- no revenue ever posted', () => {
  it('is a no-op', async () => {
    seedBooking(A, 'bk-none')
    const result = await reverseBookingRevenueIfPosted(A, 'bk-none')
    expect(result).toEqual({ reversed: false, reason: 'no_revenue_posted' })
  })
})

describe('reverseCancelledBookingRevenue -- tenant-wide safety-net scan', () => {
  it('reverses only bookings actually marked cancelled', async () => {
    seedPostedBookingRevenue(A, 'bk-c1', 3_000)
    seedBooking(A, 'bk-c1', { status: 'cancelled', payment_status: 'paid' })
    seedPostedBookingRevenue(A, 'bk-active', 4_000)
    seedBooking(A, 'bk-active', { status: 'confirmed', payment_status: 'paid' })

    const result = await reverseCancelledBookingRevenue(A)
    expect(result).toEqual({ scanned: 1, reversed: 1, reversedCents: 3_000 })
    expect(h.store.journal_entries.filter((e) => e.source === 'booking_reversal' && e.source_id === 'bk-c1')).toHaveLength(1)
    expect(h.store.journal_entries.filter((e) => e.source === 'booking_reversal' && e.source_id === 'bk-active')).toHaveLength(0)
  })

  it('skips a cancelled booking already refunded through Stripe', async () => {
    seedPostedBookingRevenue(A, 'bk-c2', 6_000)
    seedBooking(A, 'bk-c2', { status: 'cancelled', payment_status: 'refunded' })

    const result = await reverseCancelledBookingRevenue(A)
    expect(result).toEqual({ scanned: 1, reversed: 0, reversedCents: 0 })
  })

  it('never touches another tenant\'s bookings', async () => {
    seedPostedBookingRevenue(B, 'bk-other', 9_000)
    seedBooking(B, 'bk-other', { status: 'cancelled', payment_status: 'paid' })

    const result = await reverseCancelledBookingRevenue(A)
    expect(result).toEqual({ scanned: 0, reversed: 0, reversedCents: 0 })
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B && e.source === 'booking_reversal')).toHaveLength(0)
  })
})
