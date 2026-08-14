// Tenant-isolation test harness.
//
// A small in-memory fake of the service_role Supabase client that ACTUALLY
// applies the filters a query chains (`.eq`, `.in`, `.is`, …) against a seeded,
// multi-tenant dataset. It is built specifically to prove tenant isolation on
// routes converted to `tenantDb(...)`:
//
//   • tenantDb.select() injects `.eq('tenant_id', <ctx>)` — so a row seeded for
//     another tenant is genuinely filtered OUT here (a real wrong-tenant probe,
//     not a structural assertion that can rot silently).
//   • tenantDb.insert() stamps `tenant_id` last (overriding any caller value) —
//     `capture.inserts` records exactly what hit the table so a test can assert
//     the stamp won even when the request body tried to forge a foreign tenant.
//
// Wire-up (per test file), using vi.hoisted so the mock factory can reach the
// live `from` at call time:
//
//   const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
//   vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
//   import { createTenantDbHarness } from '@/test/tenant-isolation-harness'
//   let h: Harness
//   beforeEach(() => { h = createTenantDbHarness(seed()); holder.from = h.from })
//
// This is TEST infrastructure. It mutates its own seed to emulate a database and
// is deliberately untyped at the query surface (the real service_role client is
// untyped too); tenant-safety, not row typing, is what these tests assert.

export type Row = Record<string, any>
export type Seed = Record<string, Row[]>

export interface Capture {
  inserts: Array<{ table: string; rows: Row[] }>
  updates: Array<{ table: string; values: Row; matched: Row[] }>
  deletes: Array<{ table: string; matched: Row[] }>
}

export interface Harness {
  from: (table: string) => any
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  seed: Seed
  capture: Capture
}

type Filter =
  | { kind: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; col: string; val: unknown }
  | { kind: 'in'; col: string; val: unknown[] }
  | { kind: 'is'; col: string; val: unknown }
  | { kind: 'ilike'; col: string; val: string }

// Translate a SQL LIKE/ILIKE pattern (`%` = any run, `_` = any char) into a
// case-insensitive anchored RegExp. Everything else is escaped literally.
function ilikeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const body = escaped.replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${body}$`, 'i')
}

function matches(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((r) =>
    filters.every((f) => {
      const cur = r[f.col]
      switch (f.kind) {
        case 'eq':
          return cur === f.val
        case 'neq':
          return cur !== f.val
        case 'in':
          return f.val.includes(cur)
        case 'ilike':
          return typeof cur === 'string' && ilikeToRegex(f.val).test(cur)
        case 'is':
          return f.val === null ? cur === null || cur === undefined : cur === f.val
        case 'gt':
          return (cur as number) > (f.val as number)
        case 'gte':
          return (cur as number) >= (f.val as number)
        case 'lt':
          return (cur as number) < (f.val as number)
        case 'lte':
          return (cur as number) <= (f.val as number)
        default:
          return true
      }
    }),
  )
}

type SelectOpts = { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }

export function createTenantDbHarness(seed: Seed): Harness {
  const capture: Capture = { inserts: [], updates: [], deletes: [] }
  let insertSeq = 0

  function table(name: string) {
    const rows = () => (seed[name] ||= [])

    function builder() {
      let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
      const filters: Filter[] = []
      let selectOpts: SelectOpts = {}
      let insertRows: Row[] = []
      let updateValues: Row = {}
      let limitN: number | undefined
      let rangeFrom: number | undefined
      let rangeTo: number | undefined
      let selectChained = false

      const push = (f: Filter) => {
        filters.push(f)
        return chain
      }

      // Compute the terminal result appropriate to the current op.
      function resolve(): { data: unknown; error: unknown; count?: number } {
        if (op === 'insert') {
          return { data: insertRows, error: null }
        }
        if (op === 'update') {
          const hit = matches(rows(), filters)
          hit.forEach((r) => Object.assign(r, updateValues))
          capture.updates.push({ table: name, values: updateValues, matched: hit })
          return { data: hit, error: null }
        }
        if (op === 'delete') {
          const hit = matches(rows(), filters)
          seed[name] = rows().filter((r) => !hit.includes(r))
          capture.deletes.push({ table: name, matched: hit })
          // Real supabase-js only returns the deleted rows when `.select()` was
          // chained; without it `data` is always null, matching the real client.
          return { data: selectChained ? hit : null, error: null }
        }
        // select
        let hit = matches(rows(), filters)
        // `.range(from, to)` is inclusive on both ends (PostgREST semantics) and
        // takes precedence over `.limit` when both are chained.
        if (typeof rangeFrom === 'number' && typeof rangeTo === 'number') {
          hit = hit.slice(rangeFrom, rangeTo + 1)
        } else if (typeof limitN === 'number') {
          hit = hit.slice(0, limitN)
        }
        if (selectOpts.head) return { data: null, error: null, count: hit.length }
        if (selectOpts.count) return { data: hit, error: null, count: hit.length }
        return { data: hit, error: null }
      }

      function first(): { data: unknown; error: unknown } {
        if (op === 'insert') return { data: insertRows[0] ?? null, error: null }
        if (op === 'update') {
          const r = resolve()
          const arr = (r.data as Row[]) || []
          return arr.length
            ? { data: arr[0], error: null }
            : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
        }
        const hit = matches(rows(), filters)
        return hit.length
          ? { data: hit[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
      }

      const chain: Record<string, unknown> = {
        select: (_cols?: unknown, opts?: SelectOpts) => {
          selectChained = true
          if (op === 'select') selectOpts = opts || {}
          return chain
        },
        insert: (r: Row | Row[]) => {
          op = 'insert'
          const arr = (Array.isArray(r) ? r : [r]).map((row) => ({
            id: row.id ?? `${name}-ins-${++insertSeq}`,
            ...row,
          }))
          insertRows = arr
          rows().push(...arr)
          capture.inserts.push({ table: name, rows: arr })
          return chain
        },
        upsert: (r: Row | Row[]) => {
          ;(chain.insert as (x: Row | Row[]) => unknown)(r)
          op = 'upsert'
          return chain
        },
        update: (values: Row) => {
          op = 'update'
          updateValues = values
          return chain
        },
        delete: () => {
          op = 'delete'
          return chain
        },
        eq: (col: string, val: unknown) => push({ kind: 'eq', col, val }),
        neq: (col: string, val: unknown) => push({ kind: 'neq', col, val }),
        in: (col: string, val: unknown[]) => push({ kind: 'in', col, val }),
        is: (col: string, val: unknown) => push({ kind: 'is', col, val }),
        ilike: (col: string, val: string) => push({ kind: 'ilike', col, val }),
        gt: (col: string, val: unknown) => push({ kind: 'gt', col, val }),
        gte: (col: string, val: unknown) => push({ kind: 'gte', col, val }),
        lt: (col: string, val: unknown) => push({ kind: 'lt', col, val }),
        lte: (col: string, val: unknown) => push({ kind: 'lte', col, val }),
        not: () => chain,
        // `.or(...)` is a no-op in the harness (like `.not`): its PostgREST filter
        // string isn't parsed here. Probes that need `.or` must not depend on it to
        // prove isolation — the `.eq('tenant_id')` tenantDb injects is what filters.
        or: () => chain,
        order: () => chain,
        limit: (n: number) => {
          limitN = n
          return chain
        },
        range: (from: number, to: number) => {
          rangeFrom = from
          rangeTo = to
          return chain
        },
        single: async () => first(),
        maybeSingle: async () => {
          const r = first()
          return r.error ? { data: null, error: null } : r
        },
        // Thenable: `await db.from(t).select(...)...` resolves here.
        then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(resolve()).then(onFulfilled, onRejected),
      }
      return chain
    }

    return builder()
  }

  // Fake of merge_client_atomic (2026_08_13_merge_client_atomic.sql) --
  // mirrors that plpgsql function's exact steps (demote primaries BEFORE
  // repointing, so the demote's client_id=duplicate filter still matches;
  // repoint every table; retire the duplicate) against the in-memory seed,
  // same spirit as `from()` faking Postgres for `.eq`/`.update`/etc above.
  // Any other RPC name is unmocked and throws, so a test exercising an
  // untested RPC fails loudly instead of silently no-op'ing.
  function rpc(fnName: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> {
    if (fnName !== 'merge_client_atomic') {
      throw new Error(`tenant-isolation-harness: unmocked rpc "${fnName}"`)
    }
    const { p_tenant_id, p_canonical_id, p_duplicate_id, p_repoint_tables, p_merge_note, p_existing_notes } = args as {
      p_tenant_id: string
      p_canonical_id: string
      p_duplicate_id: string
      p_repoint_tables: string[]
      p_merge_note: string
      p_existing_notes: string
    }
    const clientsRows = seed.clients || []
    const canonicalRow = clientsRows.find((c) => c.id === p_canonical_id && c.tenant_id === p_tenant_id)
    const duplicateRow = clientsRows.find((c) => c.id === p_duplicate_id && c.tenant_id === p_tenant_id)
    if (!canonicalRow || !duplicateRow) {
      return Promise.resolve({ data: null, error: { message: 'canonical or duplicate client not found for this tenant' } })
    }

    const demote = (table: string) => {
      for (const row of seed[table] || []) {
        if (row.client_id === p_duplicate_id && row.tenant_id === p_tenant_id) row.is_primary = false
      }
    }
    demote('client_contacts')
    demote('client_properties')

    const moved: Record<string, number> = {}
    for (const t of p_repoint_tables) {
      let count = 0
      for (const row of seed[t] || []) {
        if (row.client_id === p_duplicate_id && row.tenant_id === p_tenant_id) {
          row.client_id = p_canonical_id
          count++
        }
      }
      moved[t] = count
    }

    duplicateRow.active = false
    duplicateRow.do_not_service = true
    duplicateRow.notes = p_existing_notes ? `${p_merge_note}\n${p_existing_notes}` : p_merge_note

    return Promise.resolve({ data: moved, error: null })
  }

  return { from: table, rpc, seed, capture }
}
