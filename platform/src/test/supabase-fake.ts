/**
 * Shared in-memory Supabase fake for route-level lifecycle tests (P1/W1).
 *
 * Extracted from the three lifecycle tests (invoice / recurring / quote), which
 * each carried a near-identical ~90-line hand-rolled copy. It drives the REAL
 * route handlers against an injected mutable store, so tenant scoping shows up
 * as real row placement rather than a mocked return value.
 *
 * The store handle `h` is created per-test with `vi.hoisted(...)` (so the
 * `vi.mock('@/lib/supabase', ...)` factory can reach it) and passed in here.
 * Per-test behaviour differences are expressed through options, so this one
 * factory reproduces all three original fakes exactly:
 *
 *   - insertDefaults : columns defaulted on insert unless the payload sets them
 *                      (invoice defaulted `created_at`). Applied as
 *                      `{ ...insertDefaults, ...payload }` so payload wins.
 *   - afterInsert    : run after a row lands — emulate a DB trigger (invoice
 *                      recomputes an invoice when a `payments` row inserts).
 *   - detachReads    : hand back detached row copies from selects, matching
 *                      PostgREST JSON semantics (the quote-accept route re-reads
 *                      a deal it just updated; a live reference would read the
 *                      just-written value).
 *
 * Supported query surface (superset; unused bits are inert for a given test):
 *   from(table)
 *     .select(cols?, { head }) .insert(payload) .update(payload)
 *     .eq(col, val) .gte(col, val) .lt(col, val) .not() .order() .limit()
 *     .single() .maybeSingle() .then(...)   // awaiting the chain = "many"
 *
 * `gte`/`lt` compare stringwise (`String(a) >= String(b)`), which is what the
 * invoice window queries relied on; `select(_, { head: true })` returns a
 * `{ count }` instead of rows.
 */

export interface FakeStoreHandle {
  /** monotonic id counter; the fake assigns `${table}-${seq}` when a row has no id */
  seq: number
  /** table name -> rows */
  store: Record<string, Array<Record<string, unknown>>>
}

export interface SupabaseFakeOptions {
  /** defaults merged UNDER each inserted row (`{ ...insertDefaults, ...payload }`) */
  insertDefaults?: Record<string, unknown>
  /** called after each inserted row is stored — emulate a DB trigger */
  afterInsert?: (row: Record<string, unknown>, table: string) => void
  /** return detached copies from selects (PostgREST-accurate; never a live row) */
  detachReads?: boolean
}

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  eqs: Record<string, unknown>
  gtes: Array<{ col: string; val: unknown }>
  lts: Array<{ col: string; val: unknown }>
  head: boolean
  payload: unknown
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  for (const g of s.gtes) if (!(String(r[g.col]) >= String(g.val))) return false
  for (const l of s.lts) if (!(String(r[l.col]) < String(l.val))) return false
  return true
}

function runQuery(
  h: FakeStoreHandle,
  state: State,
  terminal: 'single' | 'maybeSingle' | 'many',
  opts: SupabaseFakeOptions,
) {
  const rows = h.store[state.table] || (h.store[state.table] = [])

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = payload.map((p: Record<string, unknown>) => {
      const row: Record<string, unknown> = { ...(opts.insertDefaults ?? {}), ...(p as object) }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      opts.afterInsert?.(row, state.table)
      return row
    })
    if (terminal === 'many') return { data: inserted, error: null }
    return { data: inserted[0] ?? null, error: null }
  }

  if (state.op === 'update') {
    for (const r of rows) if (matches(r, state)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  let found = rows.filter((r) => matches(r, state))
  if (state.head) return { count: found.length, data: null, error: null }
  if (opts.detachReads) found = found.map((r) => ({ ...r }))
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

/**
 * Build a Supabase-shaped client backed by `h.store`. Call once per binding you
 * need to mock, e.g.:
 *   vi.mock('@/lib/supabase', () => ({
 *     supabaseAdmin: makeSupabaseFake(h),
 *     supabase: makeSupabaseFake(h),
 *   }))
 */
export function makeSupabaseFake(h: FakeStoreHandle, opts: SupabaseFakeOptions = {}) {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, gtes: [], lts: [], head: false, payload: null }
      const chain: Record<string, unknown> = {
        select: (_cols?: unknown, o?: { head?: boolean }) => { if (o?.head) state.head = true; return chain },
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        gte: (col: string, val: unknown) => { state.gtes.push({ col, val }); return chain },
        lt: (col: string, val: unknown) => { state.lts.push({ col, val }); return chain },
        not: () => chain,
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve(runQuery(h, state, 'single', opts)),
        maybeSingle: () => Promise.resolve(runQuery(h, state, 'maybeSingle', opts)),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(h, state, 'many', opts)).then(res, rej),
      }
      return chain
    },
  }
}
