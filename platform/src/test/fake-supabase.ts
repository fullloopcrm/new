/**
 * Faithful in-memory Supabase fake for cross-tenant isolation tests.
 *
 * WHY THIS EXISTS (and why it is deliberately "dumb"):
 * The whole point of the cross-tenant attack suite is to prove that the app's
 * tenant filters (`.eq('tenant_id', …)`, the `tenantDb` wrapper) are what stop
 * a leak. A green test only means something if the underlying store WOULD leak
 * without the filter. So this fake implements PostgREST filter semantics
 * literally: no hidden tenant scoping, no RLS, `service_role`-style god access —
 * exactly like the real `supabaseAdmin`. If a query forgets a tenant filter,
 * this fake returns the other tenant's row, and the test catches it.
 *
 * It supports only the surface the suite exercises:
 *   from(table)
 *     .select(cols, { count })  .insert(rows)  .update(vals)  .delete()  .upsert(rows,{onConflict})
 *     .eq(col,val) .neq .in(col,vals) .gte .lte .lt .is(col,val) .ilike(col,pattern) .order() .range() .limit(n)
 *     .single() .maybeSingle()  and thenable (await) resolution
 *
 * Not a general-purpose mock — do not grow it beyond what a test needs.
 */

export type Row = Record<string, unknown>

export type QueryResult<T = Row> = {
  data: T | T[] | null
  error: { message: string } | null
  count: number | null
}

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'neq'; col: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[] }
  | { kind: 'gte'; col: string; val: unknown }
  | { kind: 'lte'; col: string; val: unknown }
  | { kind: 'lt'; col: string; val: unknown }
  | { kind: 'is'; col: string; val: null | boolean }
  | { kind: 'ilike'; col: string; pattern: RegExp }
  | { kind: 'not'; inner: Filter }

function matchesOne(row: Row, f: Filter): boolean {
  if (f.kind === 'not') return !matchesOne(row, f.inner)
  const cell = row[f.col]
  switch (f.kind) {
    case 'eq':
      return cell === f.val
    case 'neq':
      return cell !== f.val
    case 'in':
      return f.vals.includes(cell)
    case 'gte':
      return cell !== undefined && cell !== null && (cell as number | string) >= (f.val as number | string)
    case 'lte':
      return cell !== undefined && cell !== null && (cell as number | string) <= (f.val as number | string)
    case 'lt':
      return cell !== undefined && cell !== null && (cell as number | string) < (f.val as number | string)
    case 'is':
      return f.val === null ? cell === null || cell === undefined : cell === f.val
    case 'ilike':
      return typeof cell === 'string' && f.pattern.test(cell)
  }
}

function matches(row: Row, filters: Filter[]): boolean {
  for (const f of filters) {
    if (!matchesOne(row, f)) return false
  }
  return true
}

function clone(row: Row): Row {
  return JSON.parse(JSON.stringify(row))
}

/** A single from().<op>() chain. Thenable so `await` resolves it. */
class QueryBuilder implements PromiseLike<QueryResult> {
  private filters: Filter[] = []
  private wantCount = false
  private orderCol: string | null = null
  private orderAsc = true
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private limitN: number | null = null

  constructor(
    private readonly store: Map<string, Row[]>,
    private readonly table: string,
    private readonly op: Op,
    private readonly payload?: { rows?: Row | Row[]; values?: Row; countMode?: boolean },
  ) {
    if (payload?.countMode) this.wantCount = true
  }

  private rows(): Row[] {
    if (!this.store.has(this.table)) this.store.set(this.table, [])
    return this.store.get(this.table) as Row[]
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: 'eq', col, val })
    return this
  }
  neq(col: string, val: unknown): this {
    this.filters.push({ kind: 'neq', col, val })
    return this
  }
  in(col: string, vals: unknown[]): this {
    this.filters.push({ kind: 'in', col, vals })
    return this
  }
  gte(col: string, val: unknown): this {
    this.filters.push({ kind: 'gte', col, val })
    return this
  }
  lte(col: string, val: unknown): this {
    this.filters.push({ kind: 'lte', col, val })
    return this
  }
  lt(col: string, val: unknown): this {
    this.filters.push({ kind: 'lt', col, val })
    return this
  }
  is(col: string, val: null | boolean): this {
    this.filters.push({ kind: 'is', col, val })
    return this
  }
  /** PostgREST `.ilike(col, 'pattern%with%wildcards')` — case-insensitive, `%` → any run of chars. */
  ilike(col: string, pattern: string): this {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')
    this.filters.push({ kind: 'ilike', col, pattern: new RegExp(`^${escaped}$`, 'i') })
    return this
  }
  /** PostgREST `.not(col, 'eq'|'is'|'neq', val)` — negates the named simple filter. */
  not(col: string, op: 'eq' | 'is' | 'neq', val: unknown): this {
    const inner: Filter =
      op === 'eq' ? { kind: 'eq', col, val }
      : op === 'neq' ? { kind: 'neq', col, val }
      : { kind: 'is', col, val: val as null | boolean }
    this.filters.push({ kind: 'not', inner })
    return this
  }
  /** No-op: PostgREST `.or('a,b')` syntax isn't parsed here — it never narrows
   * or widens tenant isolation (that's always `.eq('tenant_id', …)`), so tests
   * that need business-filter precision should assert on a query that avoids
   * `.or()` rather than rely on this to filter anything. */
  or(_filter: string): this {
    return this
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col
    this.orderAsc = opts?.ascending !== false
    return this
  }
  range(from: number, to: number): this {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }
  limit(n: number): this {
    this.limitN = n
    return this
  }
  /** insert(...).select() etc. — selecting after a write just returns written rows. */
  select(_cols?: string, opts?: { count?: string }): this {
    if (opts?.count) this.wantCount = true
    return this
  }

  private run(): QueryResult {
    const table = this.rows()

    if (this.op === 'insert' || this.op === 'upsert') {
      const incoming = Array.isArray(this.payload?.rows)
        ? (this.payload?.rows as Row[])
        : this.payload?.rows
          ? [this.payload.rows as Row]
          : []
      const inserted = incoming.map(clone)
      table.push(...inserted)
      return { data: inserted, error: null, count: inserted.length }
    }

    if (this.op === 'update') {
      const updated: Row[] = []
      for (const row of table) {
        if (matches(row, this.filters)) {
          Object.assign(row, this.payload?.values ?? {})
          updated.push(clone(row))
        }
      }
      return { data: updated, error: null, count: updated.length }
    }

    if (this.op === 'delete') {
      const kept: Row[] = []
      const removed: Row[] = []
      for (const row of table) {
        if (matches(row, this.filters)) removed.push(clone(row))
        else kept.push(row)
      }
      this.store.set(this.table, kept)
      return { data: removed, error: null, count: removed.length }
    }

    // select
    let result = table.filter((r) => matches(r, this.filters)).map(clone)
    const total = result.length
    if (this.orderCol) {
      const col = this.orderCol
      result = result.sort((a, b) => {
        const av = a[col] as number | string
        const bv = b[col] as number | string
        if (av === bv) return 0
        const cmp = av > bv ? 1 : -1
        return this.orderAsc ? cmp : -cmp
      })
    }
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1)
    }
    if (this.limitN !== null) {
      result = result.slice(0, this.limitN)
    }
    return { data: result, error: null, count: this.wantCount ? total : null }
  }

  async single(): Promise<QueryResult> {
    const res = this.run()
    const arr = Array.isArray(res.data) ? res.data : res.data ? [res.data] : []
    if (arr.length !== 1) {
      return { data: null, error: { message: `Expected 1 row, got ${arr.length}` }, count: res.count }
    }
    return { data: arr[0], error: null, count: res.count }
  }

  async maybeSingle(): Promise<QueryResult> {
    const res = this.run()
    const arr = Array.isArray(res.data) ? res.data : res.data ? [res.data] : []
    if (arr.length > 1) {
      return { data: null, error: { message: `Expected 0-1 rows, got ${arr.length}` }, count: res.count }
    }
    return { data: arr[0] ?? null, error: null, count: res.count }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

class FromBuilder {
  constructor(
    private readonly store: Map<string, Row[]>,
    private readonly table: string,
  ) {}

  select(cols?: string, opts?: { count?: string; head?: boolean }): QueryBuilder {
    return new QueryBuilder(this.store, this.table, 'select', { countMode: !!opts?.count })
  }
  insert(rows: Row | Row[]): QueryBuilder {
    return new QueryBuilder(this.store, this.table, 'insert', { rows })
  }
  update(values: Row): QueryBuilder {
    return new QueryBuilder(this.store, this.table, 'update', { values })
  }
  delete(): QueryBuilder {
    return new QueryBuilder(this.store, this.table, 'delete')
  }
  upsert(rows: Row | Row[], _opts?: { onConflict?: string; ignoreDuplicates?: boolean }): QueryBuilder {
    return new QueryBuilder(this.store, this.table, 'upsert', { rows })
  }
}

export type FakeSupabase = {
  from(table: string): FromBuilder
  /** test helper — raw row access for assertions / seeding */
  _store: Map<string, Row[]>
  _seed(table: string, rows: Row[]): void
  _all(table: string): Row[]
}

export function createFakeSupabase(seed?: Record<string, Row[]>): FakeSupabase {
  const store = new Map<string, Row[]>()
  if (seed) for (const [table, rows] of Object.entries(seed)) store.set(table, rows.map(clone))

  return {
    from(table: string) {
      return new FromBuilder(store, table)
    },
    _store: store,
    _seed(table: string, rows: Row[]) {
      const existing = store.get(table) ?? []
      store.set(table, [...existing, ...rows.map(clone)])
    },
    _all(table: string) {
      return store.get(table) ?? []
    },
  }
}
