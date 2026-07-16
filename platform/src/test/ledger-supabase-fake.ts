/**
 * Shared in-memory Supabase fake for LEDGER-path tests (P1/W1).
 *
 * The extracted route fake in ./supabase-fake.ts deliberately omits two things
 * the double-entry ledger path needs, so the money tests each carried their own
 * ~90-line copy of this. Extracted here so money-adjustments.test.ts and
 * money-math-edge-cases.test.ts share one definition:
 *
 *   - rpc('post_journal_entry', …) : writes the journal entry + its lines, the
 *     way the real Postgres RPC does — so postJournalEntry() lands real rows.
 *   - upsert(payload, { onConflict, ignoreDuplicates }) : the idempotency
 *     mechanism (a webhook retry must not double-post).
 *
 * Kept SEPARATE from ./supabase-fake.ts rather than merged into it: that fake
 * models route CRUD with stringwise gte/lt window queries; this one models the
 * ledger's rpc + upsert. Two focused fakes, low coupling — merging into one
 * god-fake would risk the route lifecycle tests.
 *
 * The store handle `h` is created per-test with `vi.hoisted(...)` (so the
 * `vi.mock('@/lib/supabase', …)` factory can reach it) and passed in here.
 *
 * Supported query surface (superset across the finance money tests):
 *   from(table)
 *     .select(cols?, { head }) .insert(p) .update(p) .upsert(p, opts)
 *     .eq(col,val) .neq(col,val) .in(col,vals) .gt(col,val) .gte(col,val) .lt(col,val)
 *     .not() .order() .range() .limit()
 *     .single() .maybeSingle() .then(...)   // awaiting the chain = "many"
 *   rpc('post_journal_entry', params)
 *
 * Window ops: `gt` compares numerically; `gte`/`lt` compare stringwise (what the
 * invoice monthly-count window in money-spine relies on). These are inert for the
 * adjustment/edge tests, which never call them.
 */
import type { FakeStoreHandle } from './supabase-fake'

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'upsert'
  eqs: Record<string, unknown>
  neqs: Record<string, unknown>
  ins: Array<{ col: string; vals: unknown[] }>
  gts: Array<{ col: string; val: unknown }>
  gtes: Array<{ col: string; val: unknown }>
  lts: Array<{ col: string; val: unknown }>
  /** `.is(col, null | true | false)` — PostgREST's IS NULL / IS TRUE / IS FALSE. */
  ises: Array<{ col: string; val: null | boolean }>
  head: boolean
  payload: unknown
  upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } | null
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  if (!Object.entries(s.neqs).every(([k, v]) => r[k] !== v)) return false
  for (const i of s.ins) if (!i.vals.includes(r[i.col])) return false
  for (const g of s.gts) if (!(Number(r[g.col]) > Number(g.val))) return false
  for (const g of s.gtes) if (!(String(r[g.col]) >= String(g.val))) return false
  for (const l of s.lts) if (!(String(r[l.col]) < String(l.val))) return false
  for (const i of s.ises) if ((r[i.col] ?? null) !== i.val) return false
  return true
}

function postJournalEntryRpc(h: FakeStoreHandle, params: Record<string, unknown>): { data: unknown; error: unknown } {
  // Mirrors migration 064's partial unique index + ON CONFLICT DO NOTHING:
  // a duplicate (tenant_id, source, source_id) is an idempotent no-op that
  // returns NULL instead of inserting a second entry.
  if (params.p_source_id != null) {
    const existing = (h.store.journal_entries || []).find(
      (e) => e.tenant_id === params.p_tenant_id && e.source === params.p_source && e.source_id === params.p_source_id,
    )
    if (existing) return { data: null, error: null }
  }
  h.seq += 1
  const entryId = `je-${h.seq}`
  ;(h.store.journal_entries ||= []).push({
    id: entryId, tenant_id: params.p_tenant_id, entity_id: params.p_entity_id ?? null,
    entry_date: params.p_entry_date, memo: params.p_memo ?? null,
    source: params.p_source ?? 'manual', source_id: params.p_source_id ?? null,
  })
  const lineRows = h.store.journal_entry_lines ||= []
  for (const l of (params.p_lines as Array<Record<string, unknown>>) || []) {
    lineRows.push({
      entry_id: entryId, tenant_id: params.p_tenant_id, coa_id: l.coa_id,
      debit_cents: Number(l.debit_cents) || 0, credit_cents: Number(l.credit_cents) || 0,
      memo: l.memo ?? null,
    })
  }
  return { data: entryId, error: null }
}

function runQuery(h: FakeStoreHandle, state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])

  if (state.op === 'insert' || state.op === 'upsert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted: Array<Record<string, unknown>> = []
    for (const p of payload as Array<Record<string, unknown>>) {
      // Mirrors migration 065's partial unique index on
      // payments(tenant_id, booking_id, reference_id) WHERE reference_id IS
      // NOT NULL -- a plain insert() (not upsert) rejects a duplicate the
      // same way Postgres would, so processPayment()'s 23505 handling can be
      // exercised for real instead of mocked at the error-object level.
      if (state.op === 'insert' && state.table === 'payments' && p.reference_id != null) {
        const dup = rows.find(
          (r) => r.tenant_id === p.tenant_id && r.booking_id === p.booking_id && r.reference_id === p.reference_id,
        )
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint on payments(tenant_id,booking_id,reference_id)', code: '23505' },
          }
        }
      }
      // Mirrors migration 011's full UNIQUE constraint on
      // payments.stripe_session_id -- lets the Stripe webhook's 23505
      // handling (invoice + booking payment-insert paths) be exercised for
      // real on a true concurrent/redelivered webhook, not just mocked.
      if (state.op === 'insert' && state.table === 'payments' && p.stripe_session_id != null) {
        const dup = rows.find((r) => r.stripe_session_id === p.stripe_session_id)
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint on payments(stripe_session_id)', code: '23505' },
          }
        }
      }
      // Mirrors migration 2026_07_16_unique_payments_raw_email_id's partial
      // unique index on payments(tenant_id, raw_email_id) WHERE raw_email_id
      // IS NOT NULL -- lets email/monitor's concurrent-invocation 23505
      // handling be exercised for real.
      if (state.op === 'insert' && state.table === 'payments' && p.raw_email_id != null) {
        const dup = rows.find((r) => r.tenant_id === p.tenant_id && r.raw_email_id === p.raw_email_id)
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint on payments(tenant_id,raw_email_id)', code: '23505' },
          }
        }
      }
      // Mirrors migration 066's unique index on referral_commissions(booking_id)
      // WHERE booking_id IS NOT NULL -- lets the POST /api/referral-commissions
      // 23505 handling be exercised for real.
      if (state.op === 'insert' && state.table === 'referral_commissions' && p.booking_id != null) {
        const dup = rows.find((r) => r.booking_id === p.booking_id)
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint on referral_commissions(booking_id)', code: '23505' },
          }
        }
      }
      // Mirrors 2026_07_16_team_member_payouts_dedup.sql's partial unique
      // index on team_member_payouts(tenant_id, idempotency_key) WHERE
      // idempotency_key IS NOT NULL -- lets the manual cleaner-payout route's
      // 23505 handling be exercised for real on a true concurrent resubmission.
      if (state.op === 'insert' && state.table === 'team_member_payouts' && p.idempotency_key != null) {
        const dup = rows.find((r) => r.tenant_id === p.tenant_id && r.idempotency_key === p.idempotency_key)
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint on team_member_payouts(tenant_id,idempotency_key)', code: '23505' },
          }
        }
      }
      // Mirrors 2026_07_16_payroll_payments_dedup.sql's partial unique index
      // on payroll_payments(tenant_id, idempotency_key) WHERE idempotency_key
      // IS NOT NULL -- lets the manual payroll-payment route's 23505 handling
      // be exercised for real on a true concurrent resubmission.
      if (state.op === 'insert' && state.table === 'payroll_payments' && p.idempotency_key != null) {
        const dup = rows.find((r) => r.tenant_id === p.tenant_id && r.idempotency_key === p.idempotency_key)
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint on payroll_payments(tenant_id,idempotency_key)', code: '23505' },
          }
        }
      }
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
    const updated: Array<Record<string, unknown>> = []
    for (const r of rows) {
      if (matches(r, state)) {
        Object.assign(r, state.payload as object)
        updated.push(r)
      }
    }
    if (terminal === 'many') return { data: updated, error: null }
    if (terminal === 'single') return { data: updated[0] ?? null, error: updated[0] ? null : { message: 'no rows' } }
    return { data: updated[0] ?? null, error: null }
  }

  const found = rows.filter((r) => matches(r, state))
  if (state.head) return { count: found.length, data: null, error: null }
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

/** Build a Supabase-shaped client (from + rpc) backed by the in-memory store `h`. */
export function makeLedgerSupabaseFake(h: FakeStoreHandle) {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, neqs: {}, ins: [], gts: [], gtes: [], lts: [], ises: [], head: false, payload: null, upsertOpts: null }
      const chain: Record<string, unknown> = {
        select: (_c?: unknown, opts?: { head?: boolean }) => { if (opts?.head) state.head = true; return chain },
        insert: (p: unknown) => { state.op = 'insert'; state.payload = p; return chain },
        update: (p: unknown) => { state.op = 'update'; state.payload = p; return chain },
        upsert: (p: unknown, opts?: State['upsertOpts']) => { state.op = 'upsert'; state.payload = p; state.upsertOpts = opts ?? null; return chain },
        eq: (c: string, v: unknown) => { state.eqs[c] = v; return chain },
        neq: (c: string, v: unknown) => { state.neqs[c] = v; return chain },
        is: (c: string, v: null | boolean) => { state.ises.push({ col: c, val: v }); return chain },
        in: (c: string, v: unknown[]) => { state.ins.push({ col: c, vals: v }); return chain },
        gt: (c: string, v: unknown) => { state.gts.push({ col: c, val: v }); return chain },
        gte: (c: string, v: unknown) => { state.gtes.push({ col: c, val: v }); return chain },
        lt: (c: string, v: unknown) => { state.lts.push({ col: c, val: v }); return chain },
        not: () => chain, order: () => chain, range: () => chain, limit: () => chain, ilike: () => chain,
        single: () => Promise.resolve(runQuery(h, state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(h, state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(h, state, 'many')).then(res, rej),
      }
      return chain
    },
    rpc: (name: string, params: Record<string, unknown>) =>
      Promise.resolve(name === 'post_journal_entry' ? postJournalEntryRpc(h, params) : { data: null, error: { message: `unknown rpc ${name}` } }),
  }
}
