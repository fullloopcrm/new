/**
 * Money-math correctness for deposits, refunds, chargebacks, and the
 * payment revenue/tip split (P1/W1 queue item b).
 *
 * These are the amount calculations that decide how money lands in the books.
 * Run against the REAL post-adjustments.ts / post-revenue.ts + ledger.ts, with a
 * `post_journal_entry` RPC emulated by the in-memory fake (writes the entry + its
 * lines). Every case asserts the exact debit/credit amounts, the double-entry
 * balance invariant, tenant scope, and the money-in-danger edges:
 *
 *   - Deposit    DR 1050 / CR 2350 (unearned liability, NOT revenue)
 *   - Refund     DR 4000 / CR 1050 (reverse the sale)
 *   - Chargeback DR 6110 / CR 1050 (record the loss)
 *   - Revenue    DR 1050 / CR 4000 (amount − tip) / CR 4100 (tip)
 *
 * Edges pinned: zero/negative amounts post nothing; a tip that equals the amount
 * yields a pure-tip entry (no 4000 line); a tip that EXCEEDS the amount is
 * rejected (never a negative revenue credit); every posting is idempotent by
 * (source, source_id) so a webhook retry can't double-count.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
// Import the fake BEFORE any module that pulls @/lib/supabase (e.g. ../ledger),
// so its binding is initialized before the hoisted vi.mock factory fires.
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

// Shared with money-math-edge-cases.test.ts via @/test/ledger-supabase-fake
// (rpc post_journal_entry + upsert idempotency).
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postDepositToLedger, postRefundToLedger, postChargebackToLedger } from './post-adjustments'
import { postPaymentRevenue } from './post-revenue'

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

beforeEach(() => {
  h.seq = 0
  h.store = { chart_of_accounts: [], journal_entries: [], journal_entry_lines: [], payments: [] }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('postDepositToLedger — deposit is an unearned liability, not revenue', () => {
  it('posts DR 1050 / CR 2350 for the full deposit amount, balanced', async () => {
    const r = await postDepositToLedger({ tenantId: A, sourceId: 'quote-1', amountCents: 25000 })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['1050']).toEqual({ debit: 25000, credit: 0 })
    expect(byCode['2350']).toEqual({ debit: 0, credit: 25000 })
    // never touches revenue (4000) — a deposit is unearned
    expect(byCode['4000']).toBeUndefined()
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('refuses a zero deposit (posts nothing)', async () => {
    const r = await postDepositToLedger({ tenantId: A, sourceId: 'quote-z', amountCents: 0 })
    expect(r).toMatchObject({ posted: false, reason: 'zero_amount' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('refuses a negative deposit (posts nothing)', async () => {
    const r = await postDepositToLedger({ tenantId: A, sourceId: 'quote-n', amountCents: -500 })
    expect(r).toMatchObject({ posted: false, reason: 'zero_amount' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('is idempotent by (deposit, sourceId): a retry posts nothing new', async () => {
    await postDepositToLedger({ tenantId: A, sourceId: 'quote-2', amountCents: 25000 })
    const again = await postDepositToLedger({ tenantId: A, sourceId: 'quote-2', amountCents: 25000 })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'deposit')).toHaveLength(1)
  })

  it('closes the TOCTOU race: two CONCURRENT posts for the same sourceId post exactly once (migration 064)', async () => {
    // journalEntryExists() is a plain SELECT — two concurrent callers can both
    // see "not posted yet" before either INSERT lands. Promise.all reproduces
    // that interleaving; the fake's RPC now enforces the same (tenant_id,
    // source, source_id) uniqueness migration 064 adds in Postgres, so exactly
    // one of the two should win.
    const [r1, r2] = await Promise.all([
      postDepositToLedger({ tenantId: A, sourceId: 'quote-race', amountCents: 10000 }),
      postDepositToLedger({ tenantId: A, sourceId: 'quote-race', amountCents: 10000 }),
    ])
    const results = [r1, r2]
    const winners = results.filter((r) => r.posted)
    const losers = results.filter((r) => !r.posted)
    expect(winners).toHaveLength(1)
    expect(losers).toMatchObject([{ posted: false, reason: 'already_posted' }])
    expect(h.store.journal_entries.filter((e) => e.source === 'deposit' && e.source_id === 'quote-race')).toHaveLength(1)
  })
})

describe('postRefundToLedger — reverse the sale', () => {
  it('posts DR 4000 / CR 1050 for the refund amount, balanced', async () => {
    const r = await postRefundToLedger({ tenantId: A, sourceId: 're_1', amountCents: 8000 })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['4000']).toEqual({ debit: 8000, credit: 0 })   // revenue reversed
    expect(byCode['1050']).toEqual({ debit: 0, credit: 8000 })   // cash out
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('posts the exact amount passed (no clamping to any prior payment)', async () => {
    // The ledger fn trusts its caller's amount; it does not look up the sale.
    const r = await postRefundToLedger({ tenantId: A, sourceId: 're_partial', amountCents: 3333 })
    expect(linesByCode(r.entryId!, A)['4000'].debit).toBe(3333)
  })

  it('refuses zero / negative refunds', async () => {
    expect(await postRefundToLedger({ tenantId: A, sourceId: 're_z', amountCents: 0 })).toMatchObject({ posted: false, reason: 'zero_amount' })
    expect(await postRefundToLedger({ tenantId: A, sourceId: 're_n', amountCents: -100 })).toMatchObject({ posted: false, reason: 'zero_amount' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('is idempotent by (refund, Stripe refund id)', async () => {
    await postRefundToLedger({ tenantId: A, sourceId: 're_dupe', amountCents: 8000 })
    const again = await postRefundToLedger({ tenantId: A, sourceId: 're_dupe', amountCents: 8000 })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'refund')).toHaveLength(1)
  })
})

describe('postChargebackToLedger — record the loss', () => {
  it('posts DR 6110 / CR 1050 for the disputed amount, balanced', async () => {
    const r = await postChargebackToLedger({ tenantId: A, sourceId: 'dp_1', amountCents: 15000 })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['6110']).toEqual({ debit: 15000, credit: 0 })
    expect(byCode['1050']).toEqual({ debit: 0, credit: 15000 })
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('refuses zero / negative chargebacks and is idempotent by dispute id', async () => {
    expect(await postChargebackToLedger({ tenantId: A, sourceId: 'dp_z', amountCents: 0 })).toMatchObject({ posted: false, reason: 'zero_amount' })
    await postChargebackToLedger({ tenantId: A, sourceId: 'dp_2', amountCents: 15000 })
    const again = await postChargebackToLedger({ tenantId: A, sourceId: 'dp_2', amountCents: 15000 })
    expect(again).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'chargeback')).toHaveLength(1)
  })
})

describe('postPaymentRevenue — the amount/tip split (balance of a payment)', () => {
  function seedPayment(id: string, tenantId: string, fields: Record<string, unknown>) {
    ;(h.store.payments ||= []).push({ id, tenant_id: tenantId, status: 'completed', method: 'stripe', ...fields })
  }

  it('splits a tipped payment: DR 1050 = amount, CR 4000 = amount − tip, CR 4100 = tip', async () => {
    seedPayment('p_tip', A, { amount_cents: 11500, tip_cents: 1500 })
    const r = await postPaymentRevenue({ tenantId: A, paymentId: 'p_tip' })
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['1050'].debit).toBe(11500)
    expect(byCode['4000'].credit).toBe(10000)
    expect(byCode['4100'].credit).toBe(1500)
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('a pure-tip payment (tip == amount) posts DR 1050 / CR 4100 only — no revenue line', async () => {
    seedPayment('p_puretip', A, { amount_cents: 2000, tip_cents: 2000 })
    const r = await postPaymentRevenue({ tenantId: A, paymentId: 'p_puretip' })
    expect(r.posted).toBe(true)
    const byCode = linesByCode(r.entryId!, A)
    expect(byCode['1050'].debit).toBe(2000)
    expect(byCode['4100'].credit).toBe(2000)
    expect(byCode['4000']).toBeUndefined()   // amount − tip == 0, no revenue credit
    expect(isBalanced(r.entryId!)).toBe(true)
  })

  it('rejects a tip that EXCEEDS the amount (never a negative revenue credit)', async () => {
    seedPayment('p_badtip', A, { amount_cents: 1000, tip_cents: 1500 })
    const r = await postPaymentRevenue({ tenantId: A, paymentId: 'p_badtip' })
    expect(r).toMatchObject({ posted: false, reason: 'tip_exceeds_amount' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('rejects a zero-amount payment', async () => {
    seedPayment('p_zero', A, { amount_cents: 0, tip_cents: 0 })
    expect(await postPaymentRevenue({ tenantId: A, paymentId: 'p_zero' })).toMatchObject({ posted: false, reason: 'zero_amount' })
  })

  it('posts partial-status revenue (a partial payment is money received)', async () => {
    seedPayment('p_partial', A, { amount_cents: 4000, tip_cents: 0, status: 'partial', booking_id: null })
    const r = await postPaymentRevenue({ tenantId: A, paymentId: 'p_partial' })
    expect(r.posted).toBe(true)
    expect(linesByCode(r.entryId!, A)['4000'].credit).toBe(4000)
  })
})

describe('tenant scope across all money adjustments', () => {
  it('a deposit + refund + chargeback for B never appear under A', async () => {
    await postDepositToLedger({ tenantId: A, sourceId: 'q_A', amountCents: 10000 })
    await postDepositToLedger({ tenantId: B, sourceId: 'q_B', amountCents: 20000 })
    await postRefundToLedger({ tenantId: B, sourceId: 're_B', amountCents: 5000 })
    await postChargebackToLedger({ tenantId: B, sourceId: 'dp_B', amountCents: 7000 })

    expect(h.store.journal_entries.filter((e) => e.tenant_id === A)).toHaveLength(1)
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B)).toHaveLength(3)
    // Every posted line carries the tenant it was posted for.
    expect((h.store.journal_entry_lines || []).every((l) => l.tenant_id === A || l.tenant_id === B)).toBe(true)
    const bTotalDebits = (h.store.journal_entry_lines || [])
      .filter((l) => l.tenant_id === B)
      .reduce((s, l) => s + Number(l.debit_cents), 0)
    // B: deposit 20000 + refund 5000 + chargeback 7000 = 32000 in debits
    expect(bTotalDebits).toBe(32000)
  })
})
