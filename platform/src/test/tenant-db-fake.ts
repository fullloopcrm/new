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
  gts: Array<{ col: string; val: unknown }>
  head: boolean
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
  for (const f of s.gts) if (!(String(r[f.col]) > String(f.val))) return false
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
  if (state.head) return { count: found.length, data: null, error: null }
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

export function makeTenantDbFake(h: FakeStoreHandle) {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, neqs: {}, ins: [], iss: [], gts: [], head: false, payload: null }
      const chain: Record<string, unknown> = {
        select: (_cols?: unknown, o?: { head?: boolean }) => { if (o?.head) state.head = true; return chain },
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
        gt: (col: string, val: unknown) => { state.gts.push({ col, val }); return chain },
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
