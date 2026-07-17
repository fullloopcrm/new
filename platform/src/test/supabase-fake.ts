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
 *     .select(cols?, { head }) .insert(payload) .update(payload) .delete() .upsert(payload, { onConflict })
 *     .eq(col, val) .gte(col, val) .lt(col, val) .is(col, null|bool) .in(col, vals) .not() .order() .limit() .returns<T>()
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
  /** `.rpc(name, args)` handlers, keyed by function name -- given the store
   *  handle + call args, returning the same `{ data, error }` shape a real
   *  Postgres function call would. Lets a test simulate a single-statement
   *  atomic RPC (e.g. a "set exactly one row true, rest false" function)
   *  without the fake's row-by-row `.update()` matcher, which can't express
   *  a per-row-conditional payload. */
  rpc?: Record<string, (h: FakeStoreHandle, args: Record<string, unknown>) => { data?: unknown; error?: unknown }>
}

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  eqs: Record<string, unknown>
  neqs: Record<string, unknown>
  gtes: Array<{ col: string; val: unknown }>
  lts: Array<{ col: string; val: unknown }>
  /** `.is(col, null | true | false)` — PostgREST's IS NULL / IS TRUE / IS FALSE. */
  ises: Array<{ col: string; val: null | boolean }>
  /** `.in(col, vals)` — PostgREST's IN (...). */
  ins: Array<{ col: string; vals: unknown[] }>
  head: boolean
  payload: unknown
  /** `.select()` was chained — same as PostgREST's `Prefer: return=representation`.
   *  Only then does `.update()` hand back the affected row(s) instead of null. */
  returning: boolean
  /** `.upsert(payload, { onConflict })` — comma-joined conflict target columns. */
  onConflict?: string
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  if (!Object.entries(s.neqs).every(([k, v]) => r[k] !== v)) return false
  for (const g of s.gtes) if (!(String(r[g.col]) >= String(g.val))) return false
  for (const l of s.lts) if (!(String(r[l.col]) < String(l.val))) return false
  for (const i of s.ises) if ((r[i.col] ?? null) !== i.val) return false
  for (const inClause of s.ins) if (!inClause.vals.includes(r[inClause.col])) return false
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
    // Real PostgREST always returns a JSON-serialized copy from an insert,
    // never a live reference to the stored row -- without detaching here, a
    // caller that mutates its own `data` result (e.g. to reflect a follow-up
    // write's outcome in the response) silently corrupts the store's actual
    // row out from under a concurrent request.
    const out = opts.detachReads ? inserted.map((r) => ({ ...r })) : inserted
    if (terminal === 'many') return { data: out, error: null }
    return { data: out[0] ?? null, error: null }
  }

  if (state.op === 'upsert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const conflictCols = (state.onConflict || 'id').split(',')
    const upserted = payload.map((p: Record<string, unknown>) => {
      const existing = rows.find((r) => conflictCols.every((c) => r[c] === p[c]))
      if (existing) {
        Object.assign(existing, p)
        return existing
      }
      const row: Record<string, unknown> = { ...(opts.insertDefaults ?? {}), ...(p as object) }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      opts.afterInsert?.(row, state.table)
      return row
    })
    const out = opts.detachReads ? upserted.map((r) => ({ ...r })) : upserted
    if (terminal === 'many') return { data: out, error: null }
    return { data: out[0] ?? null, error: null }
  }

  if (state.op === 'update') {
    let updated = rows.filter((r) => matches(r, state))
    for (const r of updated) Object.assign(r, state.payload as object)
    if (!state.returning) return { data: null, error: null }
    if (opts.detachReads) updated = updated.map((r) => ({ ...r }))
    if (terminal === 'single') return { data: updated[0] ?? null, error: updated[0] ? null : { message: 'no rows' } }
    if (terminal === 'maybeSingle') return { data: updated[0] ?? null, error: null }
    return { data: updated, error: null }
  }

  if (state.op === 'delete') {
    let deleted = rows.filter((r) => matches(r, state))
    h.store[state.table] = rows.filter((r) => !matches(r, state))
    if (!state.returning) return { data: null, error: null }
    if (opts.detachReads) deleted = deleted.map((r) => ({ ...r }))
    if (terminal === 'single') return { data: deleted[0] ?? null, error: deleted[0] ? null : { message: 'no rows' } }
    if (terminal === 'maybeSingle') return { data: deleted[0] ?? null, error: null }
    return { data: deleted, error: null }
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
    rpc(name: string, args: Record<string, unknown> = {}) {
      const handler = opts.rpc?.[name]
      if (!handler) return Promise.resolve({ data: null, error: { message: `rpc '${name}' not mocked in this test` } })
      return Promise.resolve(handler(h, args))
    },
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, neqs: {}, gtes: [], lts: [], ises: [], ins: [], head: false, payload: null, returning: false }
      const chain: Record<string, unknown> = {
        select: (_cols?: unknown, o?: { head?: boolean }) => { if (o?.head) state.head = true; state.returning = true; return chain },
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        delete: () => { state.op = 'delete'; return chain },
        upsert: (payload: unknown, o?: { onConflict?: string }) => {
          state.op = 'upsert'; state.payload = payload; state.onConflict = o?.onConflict; return chain
        },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        neq: (col: string, val: unknown) => { state.neqs[col] = val; return chain },
        gte: (col: string, val: unknown) => { state.gtes.push({ col, val }); return chain },
        lt: (col: string, val: unknown) => { state.lts.push({ col, val }); return chain },
        is: (col: string, val: null | boolean) => { state.ises.push({ col, val }); return chain },
        in: (col: string, vals: unknown[]) => { state.ins.push({ col, vals }); return chain },
        not: () => chain,
        order: () => chain,
        limit: () => chain,
        returns: () => chain,
        single: () => Promise.resolve(runQuery(h, state, 'single', opts)),
        maybeSingle: () => Promise.resolve(runQuery(h, state, 'maybeSingle', opts)),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(h, state, 'many', opts)).then(res, rej),
      }
      return chain
    },
  }
}
