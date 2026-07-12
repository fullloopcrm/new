/**
 * Money-spine end-to-end (P1/W1 queue item a).
 *
 * Exercises the full money path — booking → invoice → payment (as landed by the
 * Stripe webhook) → LEDGER ENTRY — against ONE shared in-memory Supabase fake,
 * asserting the money amount AND tenant scope at every hop:
 *
 *   1. BOOKING  — a tenant-scoped `bookings` row carries the job price (cents).
 *   2. INVOICE  — generateInvoiceNumber() (REAL) issues an INV-YYYYMM-NNNN number
 *      scoped to the tenant's monthly count; an `invoices` row is persisted.
 *   3. PAYMENT  — a `payments` row lands exactly as the Stripe webhook records it
 *      (method='stripe', booking-linked, amount = price + tip). This is the
 *      webhook's observable effect; the ledger post below is what it fires.
 *   4. LEDGER   — postPaymentRevenue() (REAL) + ledger.ts (REAL) post ONE balanced
 *      journal entry: DR 1050 = amount, CR 4000 = amount − tip, CR 4100 = tip.
 *
 * Unlike invoice-lifecycle.test.ts (which MOCKS postPaymentRevenue), this test
 * runs the real revenue-posting spine so the double-entry math and its
 * (source, source_id) idempotency are actually verified. The `post_journal_entry`
 * RPC is emulated by the fake exactly as the DB would: it writes a `journal_entries`
 * row + its `journal_entry_lines` and returns the entry id.
 *
 * Nothing here touches the network, a real key, or a real DB.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
// Import the fake BEFORE any module that pulls @/lib/supabase (e.g. ../ledger),
// so its binding is initialized before the hoisted vi.mock factory fires.
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

// ── shared mutable store, hoisted so the vi.mock factory can reach it ──
const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

// Shared with money-adjustments.test.ts + money-math-edge-cases.test.ts via
// @/test/ledger-supabase-fake (rpc post_journal_entry + upsert idempotency +
// the gte/lt window the invoice monthly-count query needs).
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { generateInvoiceNumber } from '../invoice'
import { postPaymentRevenue } from './post-revenue'

const A = 'tenant-A'
const B = 'tenant-B'

/** Seed the full chart for a tenant so getAccountIdByCode resolves real ids. */
function seedChart(tenantId: string) {
  const rows = DEFAULT_CHART.map((a) => ({
    id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type,
  }))
  ;(h.store.chart_of_accounts ||= []).push(...rows)
}

/** Reconstruct a code→{debit,credit} map for one journal entry. */
function linesByCode(entryId: string, tenantId: string) {
  const codeOf = (coaId: unknown) =>
    (h.store.chart_of_accounts || []).find((c) => c.id === coaId && c.tenant_id === tenantId)?.code as string
  const out: Record<string, { debit: number; credit: number }> = {}
  for (const l of (h.store.journal_entry_lines || []).filter((x) => x.entry_id === entryId)) {
    const code = codeOf(l.coa_id)
    out[code] = { debit: Number(l.debit_cents) || 0, credit: Number(l.credit_cents) || 0 }
  }
  return out
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [], invoices: [], payments: [], chart_of_accounts: [], journal_entries: [], journal_entry_lines: [],
  }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/** Run one tenant's booking → invoice → payment → ledger spine. Returns the leg. */
async function runSpine(tenantId: string, opts: { priceCents: number; tipCents: number; bookingId: string }) {
  const { priceCents, tipCents, bookingId } = opts

  // 1. BOOKING
  h.store.bookings.push({ id: bookingId, tenant_id: tenantId, price: priceCents, payment_status: 'unpaid' })

  // 2. INVOICE — real numbering, tenant-scoped monthly count
  const invoiceNumber = await generateInvoiceNumber(tenantId)
  const invoice = { id: `inv-${bookingId}`, tenant_id: tenantId, booking_id: bookingId, invoice_number: invoiceNumber, total_cents: priceCents, status: 'sent' }
  h.store.invoices.push(invoice)

  // 3. PAYMENT — exactly as the Stripe webhook records it (amount includes tip)
  const amountCents = priceCents + tipCents
  h.seq += 1
  const paymentId = `pay-${bookingId}`
  h.store.payments.push({
    id: paymentId, tenant_id: tenantId, booking_id: bookingId, amount_cents: amountCents,
    tip_cents: tipCents, method: 'stripe', status: 'completed',
  })

  // 4. LEDGER — real revenue post
  const result = await postPaymentRevenue({ tenantId, paymentId })
  return { invoiceNumber, invoice, paymentId, amountCents, priceCents, tipCents, bookingId, result }
}

describe('money-spine: booking → invoice → payment → ledger (happy path, tenant-scoped)', () => {
  it('BOOKING is tenant-scoped and carries the job price in cents', async () => {
    h.store.bookings.push({ id: 'bk-1', tenant_id: A, price: 12000, payment_status: 'unpaid' })
    const mine = h.store.bookings.filter((b) => b.tenant_id === A)
    expect(mine).toHaveLength(1)
    expect(mine[0].price).toBe(12000)
  })

  it('INVOICE gets a tenant-scoped INV-YYYYMM-0001 number matching the booking total', async () => {
    const leg = await runSpine(A, { priceCents: 12000, tipCents: 0, bookingId: 'bk-A1' })
    expect(String(leg.invoiceNumber)).toMatch(/^INV-\d{6}-0001$/)
    expect(leg.invoice.tenant_id).toBe(A)
    expect(leg.invoice.total_cents).toBe(12000)
  })

  it('PAYMENT lands tenant-scoped, stripe-method, booking-linked, amount = price + tip', async () => {
    const leg = await runSpine(A, { priceCents: 12000, tipCents: 1800, bookingId: 'bk-A2' })
    const pay = h.store.payments.find((p) => p.id === leg.paymentId)!
    expect(pay).toMatchObject({ tenant_id: A, booking_id: 'bk-A2', method: 'stripe', amount_cents: 13800, tip_cents: 1800 })
  })

  it('LEDGER posts ONE balanced entry: DR 1050 = amount, CR 4000 = price, CR 4100 = tip', async () => {
    const leg = await runSpine(A, { priceCents: 12000, tipCents: 1800, bookingId: 'bk-A3' })

    expect(leg.result.posted).toBe(true)
    const entryId = leg.result.entryId!
    // booking-linked payment keys the entry on the BOOKING (dedup with backfill).
    const entry = h.store.journal_entries.find((e) => e.id === entryId)!
    expect(entry).toMatchObject({ tenant_id: A, source: 'booking', source_id: 'bk-A3' })

    const byCode = linesByCode(entryId, A)
    expect(byCode['1050']).toEqual({ debit: 13800, credit: 0 })   // full amount received
    expect(byCode['4000']).toEqual({ debit: 0, credit: 12000 })   // service revenue = amount − tip
    expect(byCode['4100']).toEqual({ debit: 0, credit: 1800 })    // tip

    // double-entry invariant: debits === credits across the whole entry
    const lines = (h.store.journal_entry_lines || []).filter((l) => l.entry_id === entryId)
    const debits = lines.reduce((s, l) => s + Number(l.debit_cents), 0)
    const credits = lines.reduce((s, l) => s + Number(l.credit_cents), 0)
    expect(debits).toBe(credits)
    expect(debits).toBe(13800)
  })

  it('a tip-free payment posts only DR 1050 / CR 4000 (no 4100 tips line)', async () => {
    const leg = await runSpine(A, { priceCents: 9000, tipCents: 0, bookingId: 'bk-A4' })
    const byCode = linesByCode(leg.result.entryId!, A)
    expect(byCode['1050']).toEqual({ debit: 9000, credit: 0 })
    expect(byCode['4000']).toEqual({ debit: 0, credit: 9000 })
    expect(byCode['4100']).toBeUndefined()
  })

  it('is idempotent: re-posting the same payment does not create a second entry', async () => {
    const leg = await runSpine(A, { priceCents: 12000, tipCents: 1800, bookingId: 'bk-A5' })
    expect(leg.result.posted).toBe(true)
    const again = await postPaymentRevenue({ tenantId: A, paymentId: leg.paymentId })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source_id === 'bk-A5')).toHaveLength(1)
  })

  it("two tenants' spines never cross: B's ledger entry is invisible to A and vice-versa", async () => {
    const legA = await runSpine(A, { priceCents: 12000, tipCents: 1800, bookingId: 'bk-A6' })
    const legB = await runSpine(B, { priceCents: 5000, tipCents: 500, bookingId: 'bk-B1' })

    // Each tenant produced exactly its own entry.
    expect(h.store.journal_entries.filter((e) => e.tenant_id === A)).toHaveLength(1)
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B)).toHaveLength(1)

    // A's entry totals A's money; B's totals B's money — no leakage.
    expect(linesByCode(legA.result.entryId!, A)['1050'].debit).toBe(13800)
    expect(linesByCode(legB.result.entryId!, B)['1050'].debit).toBe(5500)

    // Every ledger line is stamped with its own tenant.
    expect((h.store.journal_entry_lines || []).every((l) => l.tenant_id === A || l.tenant_id === B)).toBe(true)
    const aLines = (h.store.journal_entry_lines || []).filter((l) => l.entry_id === legA.result.entryId)
    expect(aLines.every((l) => l.tenant_id === A)).toBe(true)
  })
})
