/**
 * In-memory Supabase fake for testing `tenantDb()`-converted routes (P1/W1
 * queue-a). Wider operator surface than `supabase-fake.ts` (adds `.in()`,
 * `.is()`, `.gt()`, `.upsert()`) because tenantDb wraps the real PostgREST
 * builder rather than a hand-rolled subset — routes built against tenantDb
 * keep chaining ordinary filters, so the fake needs to honor them for a
 * wrong-tenant probe to be meaningful (a filter the fake silently ignores
 * would make every row "match," masking a missing `.eq('tenant_id', …)`).
 *
 * `.is('a->b', null)` supports the one dotted-path case this codebase uses
 * (`metadata->read`) by checking the nested property; every other `.is()`
 * call compares the top-level column directly.
 *
 * `.not(col, 'is', null)` supports the one negated-null case this codebase
 * uses (e.g. `.not('address', 'is', null)`) — every other `.not()` shape is
 * unimplemented and will silently match everything (same limitation as the
 * rest of this fake's narrow operator surface).
 *
 * `.gte()`/`.lte()` compare as strings (ISO timestamp comparisons, the only
 * use in this codebase) — not numeric-safe for other column types.
 *
 * `select(cols, { count: 'exact' })` (without `head`) now also returns a row
 * count alongside `data`, matching PostgREST's combined data+count response.
 */

export interface FakeStoreHandle {
  seq: number
  store: Record<string, Array<Record<string, unknown>>>
}

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  eqs: Record<string, unknown>
  neqs: Record<string, unknown>
  ins: Array<{ col: string; vals: unknown[] }>
  iss: Array<{ col: string; val: unknown }>
  notNulls: string[]
  gts: Array<{ col: string; val: unknown }>
  gtes: Array<{ col: string; val: unknown }>
  ltes: Array<{ col: string; val: unknown }>
  head: boolean
  wantCount: boolean
  payload: unknown
  onConflict?: string
}

function readPath(r: Record<string, unknown>, col: string): unknown {
  if (!col.includes('->')) return r[col]
  const [top, nested] = col.split('->')
  const obj = r[top] as Record<string, unknown> | null | undefined
  return obj == null ? undefined : obj[nested]
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  if (!Object.entries(s.neqs).every(([k, v]) => r[k] !== v)) return false
  for (const f of s.ins) if (!f.vals.includes(r[f.col])) return false
  for (const f of s.iss) {
    const actual = readPath(r, f.col)
    const wantNull = f.val === null
    if (wantNull ? actual != null : actual !== f.val) return false
  }
  for (const col of s.notNulls) if (r[col] == null) return false
  for (const f of s.gts) if (!(String(r[f.col]) > String(f.val))) return false
  for (const f of s.gtes) if (!(String(r[f.col]) >= String(f.val))) return false
  for (const f of s.ltes) if (!(String(r[f.col]) <= String(f.val))) return false
  return true
}

function runQuery(h: FakeStoreHandle, state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = payload.map((p: Record<string, unknown>) => {
      const row: Record<string, unknown> = { ...p }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      return row
    })
    if (terminal === 'many') return { data: inserted, error: null }
    return { data: inserted[0] ?? null, error: null }
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
      const row: Record<string, unknown> = { ...p }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      return row
    })
    if (terminal === 'many') return { data: upserted, error: null }
    return { data: upserted[0] ?? null, error: null }
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
    if (terminal === 'maybeSingle') return { data: updated[0] ?? null, error: null }
    return { data: null, error: null }
  }

  if (state.op === 'delete') {
    h.store[state.table] = rows.filter((r) => !matches(r, state))
    return { data: null, error: null }
  }

  const found = rows.filter((r) => matches(r, state))
  const count = state.wantCount ? found.length : null
  if (state.head) return { count: found.length, data: null, error: null }
  if (terminal === 'single') return { data: found[0] ?? null, count, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, count, error: null }
  return { data: found, count, error: null }
}

export function makeTenantDbFake(h: FakeStoreHandle) {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, neqs: {}, ins: [], iss: [], notNulls: [], gts: [], gtes: [], ltes: [], head: false, wantCount: false, payload: null }
      const chain: Record<string, unknown> = {
        select: (_cols?: unknown, o?: { head?: boolean; count?: string }) => {
          if (o?.head) state.head = true
          if (o?.count) state.wantCount = true
          return chain
        },
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        delete: () => { state.op = 'delete'; return chain },
        upsert: (payload: unknown, opts?: { onConflict?: string }) => {
          state.op = 'upsert'; state.payload = payload; state.onConflict = opts?.onConflict; return chain
        },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        neq: (col: string, val: unknown) => { state.neqs[col] = val; return chain },
        in: (col: string, vals: unknown[]) => { state.ins.push({ col, vals }); return chain },
        is: (col: string, val: unknown) => { state.iss.push({ col, val }); return chain },
        not: (col: string, op: string, val: unknown) => { if (op === 'is' && val === null) state.notNulls.push(col); return chain },
        gt: (col: string, val: unknown) => { state.gts.push({ col, val }); return chain },
        gte: (col: string, val: unknown) => { state.gtes.push({ col, val }); return chain },
        lte: (col: string, val: unknown) => { state.ltes.push({ col, val }); return chain },
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve(runQuery(h, state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(h, state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(h, state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}
