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
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'upsert'
  eqs: Record<string, unknown>
  ins: Array<{ col: string; vals: unknown[] }>
  head: boolean
  payload: unknown
  upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } | null
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  for (const i of s.ins) if (!i.vals.includes(r[i.col])) return false
  return true
}

function postJournalEntryRpc(params: Record<string, unknown>): { data: unknown; error: unknown } {
  h.seq += 1
  const entryId = `je-${h.seq}`
  ;(h.store.journal_entries ||= []).push({
    id: entryId, tenant_id: params.p_tenant_id, entry_date: params.p_entry_date,
    memo: params.p_memo ?? null, source: params.p_source ?? 'manual', source_id: params.p_source_id ?? null,
  })
  const lineRows = h.store.journal_entry_lines ||= []
  for (const l of (params.p_lines as Array<Record<string, unknown>>) || []) {
    lineRows.push({
      entry_id: entryId, tenant_id: params.p_tenant_id, coa_id: l.coa_id,
      debit_cents: Number(l.debit_cents) || 0, credit_cents: Number(l.credit_cents) || 0,
    })
  }
  return { data: entryId, error: null }
}

function runQuery(state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])

  if (state.op === 'insert' || state.op === 'upsert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted: Array<Record<string, unknown>> = []
    for (const p of payload as Array<Record<string, unknown>>) {
      if (state.op === 'upsert' && state.upsertOpts?.onConflict) {
        const keys = state.upsertOpts.onConflict.split(',').map((k) => k.trim())
        const dup = rows.find((r) => keys.every((k) => r[k] === p[k]))
        if (dup) { if (state.upsertOpts.ignoreDuplicates) continue; Object.assign(dup, p); inserted.push(dup); continue }
      }
      const row: Record<string, unknown> = { created_at: '2026-07-12T00:00:00.000Z', ...p }
      if (row.id == null) { h.seq += 1; row.id = `${state.table}-${h.seq}` }
      rows.push(row); inserted.push(row)
    }
    if (terminal === 'many') return { data: inserted, error: null }
    return { data: inserted[0] ?? null, error: null }
  }

  if (state.op === 'update') {
    for (const r of rows) if (matches(r, state)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  const found = rows.filter((r) => matches(r, state))
  if (state.head) return { count: found.length, data: null, error: null }
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, ins: [], head: false, payload: null, upsertOpts: null }
      const chain: Record<string, unknown> = {
        select: (_c?: unknown, opts?: { head?: boolean }) => { if (opts?.head) state.head = true; return chain },
        insert: (p: unknown) => { state.op = 'insert'; state.payload = p; return chain },
        update: (p: unknown) => { state.op = 'update'; state.payload = p; return chain },
        upsert: (p: unknown, opts?: State['upsertOpts']) => { state.op = 'upsert'; state.payload = p; state.upsertOpts = opts ?? null; return chain },
        eq: (c: string, v: unknown) => { state.eqs[c] = v; return chain },
        in: (c: string, v: unknown[]) => { state.ins.push({ col: c, vals: v }); return chain },
        not: () => chain, order: () => chain, range: () => chain, limit: () => chain,
        single: () => Promise.resolve(runQuery(state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(state, 'many')).then(res, rej),
      }
      return chain
    },
    rpc: (name: string, params: Record<string, unknown>) =>
      Promise.resolve(name === 'post_journal_entry' ? postJournalEntryRpc(params) : { data: null, error: { message: `unknown rpc ${name}` } }),
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))

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
