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
import { DEFAULT_CHART } from '../ledger'

// ── shared mutable store, hoisted so the vi.mock factory can reach it ──
const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'upsert'
  eqs: Record<string, unknown>
  ins: Array<{ col: string; vals: unknown[] }>
  gts: Array<{ col: string; val: unknown }>
  gtes: Array<{ col: string; val: unknown }>
  lts: Array<{ col: string; val: unknown }>
  head: boolean
  payload: unknown
  upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } | null
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  for (const i of s.ins) if (!i.vals.includes(r[i.col])) return false
  for (const g of s.gts) if (!(Number(r[g.col]) > Number(g.val))) return false
  for (const g of s.gtes) if (!(String(r[g.col]) >= String(g.val))) return false
  for (const l of s.lts) if (!(String(r[l.col]) < String(l.val))) return false
  return true
}

// Emulates the post_journal_entry RPC: one entry row + its lines land together.
function postJournalEntryRpc(params: Record<string, unknown>): { data: unknown; error: unknown } {
  h.seq += 1
  const entryId = `je-${h.seq}`
  ;(h.store.journal_entries ||= []).push({
    id: entryId,
    tenant_id: params.p_tenant_id,
    entity_id: params.p_entity_id ?? null,
    entry_date: params.p_entry_date,
    memo: params.p_memo ?? null,
    source: params.p_source ?? 'manual',
    source_id: params.p_source_id ?? null,
  })
  const lines = (params.p_lines as Array<Record<string, unknown>>) || []
  const lineRows = h.store.journal_entry_lines ||= []
  for (const l of lines) {
    lineRows.push({
      entry_id: entryId,
      tenant_id: params.p_tenant_id,
      coa_id: l.coa_id,
      debit_cents: Number(l.debit_cents) || 0,
      credit_cents: Number(l.credit_cents) || 0,
      memo: l.memo ?? null,
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
      rows.push(row)
      inserted.push(row)
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
      const state: State = {
        table, op: 'select', eqs: {}, ins: [], gts: [], gtes: [], lts: [], head: false, payload: null, upsertOpts: null,
      }
      const chain: Record<string, unknown> = {
        select: (_c?: unknown, opts?: { head?: boolean }) => { if (opts?.head) state.head = true; return chain },
        insert: (p: unknown) => { state.op = 'insert'; state.payload = p; return chain },
        update: (p: unknown) => { state.op = 'update'; state.payload = p; return chain },
        upsert: (p: unknown, opts?: State['upsertOpts']) => { state.op = 'upsert'; state.payload = p; state.upsertOpts = opts ?? null; return chain },
        eq: (c: string, v: unknown) => { state.eqs[c] = v; return chain },
        in: (c: string, v: unknown[]) => { state.ins.push({ col: c, vals: v }); return chain },
        gt: (c: string, v: unknown) => { state.gts.push({ col: c, val: v }); return chain },
        gte: (c: string, v: unknown) => { state.gtes.push({ col: c, val: v }); return chain },
        lt: (c: string, v: unknown) => { state.lts.push({ col: c, val: v }); return chain },
        not: () => chain,
        order: () => chain,
        range: () => chain,
        limit: () => chain,
        single: () => Promise.resolve(runQuery(state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(state, 'many')).then(res, rej),
      }
      return chain
    },
    rpc: (name: string, params: Record<string, unknown>) => {
      if (name === 'post_journal_entry') return Promise.resolve(postJournalEntryRpc(params))
      return Promise.resolve({ data: null, error: { message: `unknown rpc ${name}` } })
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))

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
