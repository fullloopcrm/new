// Shared fake tenantDb()/supabaseAdmin double for board route tests. Each
// table gets its own response queue — push what the next call to that table
// should resolve with, in call order. Not a .test.ts file so vitest doesn't
// try to run it as a suite; import it from files that do.
export type Row = Record<string, unknown>
export type Result = { data?: unknown; error?: unknown; count?: number | null }

export function createFakeDb() {
  const queues = new Map<string, Result[]>()
  const inserted = new Map<string, Row[]>()

  function push(table: string, result: Result) {
    if (!queues.has(table)) queues.set(table, [])
    queues.get(table)!.push(result)
  }

  function next(table: string): Result {
    const q = queues.get(table)
    return q && q.length ? q.shift()! : { data: null, error: null }
  }

  function chain(table: string) {
    const c = {
      select: () => c,
      eq: () => c,
      is: () => c,
      in: () => c,
      order: () => c,
      update: () => c,
      delete: () => c,
      insert: (rows: Row | Row[]) => {
        const arr = Array.isArray(rows) ? rows : [rows]
        if (!inserted.has(table)) inserted.set(table, [])
        inserted.get(table)!.push(...arr)
        return c
      },
      single: () => Promise.resolve(next(table)),
      // Supports `await db.from(t).select(...)` used without .single() (e.g.
      // the head:true count query, or a plain list select).
      then: (resolve: (r: Result) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(next(table)).then(resolve, reject),
    }
    return c
  }

  return {
    push,
    inserted,
    from: (table: string) => chain(table),
  }
}
