import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb (src/lib/tenant-db.ts) — the auto-scoping wrapper that makes
 * `.eq('tenant_id', …)` the DEFAULT instead of a thing every route has to
 * remember. service_role bypasses RLS, so this wrapper is the primary
 * cross-tenant guard until DB-layer RLS lands.
 *
 * Contract locked here:
 *   - select  → base.select(...).eq('tenant_id', tid)   (tenant filter FIRST)
 *   - update  → base.update(v).eq('tenant_id', tid)
 *   - delete  → base.delete().eq('tenant_id', tid)
 *   - insert  → base.insert(rows) with tenant_id STAMPED on every row
 *   - upsert  → base.upsert(rows) with tenant_id STAMPED on every row
 *   - empty tenantId throws (fail closed, never an unscoped query)
 *
 * WRONG-TENANT PROBE: a caller can never smuggle another tenant's id through
 * an insert/upsert payload — the wrapper's stamp OVERRIDES it — and a query
 * built for tenant A only ever carries tenant A's id.
 *
 * supabaseAdmin is mocked with a recording query builder so we can assert the
 * exact .eq filters and stamped payloads the wrapper produces without a DB.
 */

const { captured } = vi.hoisted(() => ({ captured: [] as CapturedOp[] }))

type CapturedOp = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  eqs: [string, unknown][]
  cols?: string
  opts?: unknown
  rows?: unknown
  vals?: unknown
}

vi.mock('@/lib/supabase', () => {
  function makeOp(table: string, op: CapturedOp['op']): CapturedOp & Record<string, unknown> {
    const rec: CapturedOp & Record<string, unknown> = { table, op, eqs: [] }
    // Chainable filter methods return the same recorder so callers can keep chaining.
    const self = rec as unknown as Record<string, (...a: unknown[]) => unknown>
    self.eq = (col: unknown, val: unknown) => {
      rec.eqs.push([col as string, val])
      return rec
    }
    for (const m of ['in', 'is', 'not', 'ilike', 'order', 'limit', 'single', 'select']) {
      self[m] = () => rec
    }
    captured.push(rec)
    return rec
  }
  return {
    supabaseAdmin: {
      from(table: string) {
        return {
          select(cols: string, opts?: unknown) {
            const r = makeOp(table, 'select')
            r.cols = cols
            r.opts = opts
            return r
          },
          insert(rows: unknown) {
            const r = makeOp(table, 'insert')
            r.rows = rows
            return r
          },
          update(vals: unknown) {
            const r = makeOp(table, 'update')
            r.vals = vals
            return r
          },
          delete() {
            return makeOp(table, 'delete')
          },
          upsert(rows: unknown, opts?: unknown) {
            const r = makeOp(table, 'upsert')
            r.rows = rows
            r.opts = opts
            return r
          },
        }
      },
    },
  }
})

// Import AFTER the mock is registered.
import { tenantDb } from './tenant-db'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

beforeEach(() => {
  captured.length = 0
})

describe('tenantDb — construction', () => {
  it('throws when tenantId is empty (fail closed)', () => {
    expect(() => tenantDb('')).toThrow(/requires a tenantId/)
  })

  it('returns a scoped client for a valid tenantId', () => {
    expect(() => tenantDb(TENANT_A)).not.toThrow()
  })
})

describe('tenantDb — select auto-scopes to tenant', () => {
  it('adds .eq(tenant_id) as the FIRST filter', () => {
    tenantDb(TENANT_A).from('bookings').select('*').eq('status', 'completed')
    expect(captured).toHaveLength(1)
    const op = captured[0]
    expect(op).toMatchObject({ table: 'bookings', op: 'select', cols: '*' })
    expect(op.eqs[0]).toEqual(['tenant_id', TENANT_A])
    // caller's own filter is preserved, after the tenant filter
    expect(op.eqs).toContainEqual(['status', 'completed'])
  })

  it('forwards select options (count/head) to PostgREST', () => {
    tenantDb(TENANT_A).from('notifications').select('id', { count: 'exact', head: true })
    expect(captured[0].opts).toEqual({ count: 'exact', head: true })
    expect(captured[0].eqs[0]).toEqual(['tenant_id', TENANT_A])
  })
})

describe('tenantDb — update / delete auto-scope to tenant', () => {
  it('update carries the tenant filter', () => {
    tenantDb(TENANT_A).from('deals').update({ stage: 'won' }).eq('id', 'deal-1')
    const op = captured[0]
    expect(op).toMatchObject({ table: 'deals', op: 'update', vals: { stage: 'won' } })
    expect(op.eqs[0]).toEqual(['tenant_id', TENANT_A])
    expect(op.eqs).toContainEqual(['id', 'deal-1'])
  })

  it('delete carries the tenant filter', () => {
    tenantDb(TENANT_A).from('deals').delete().eq('id', 'deal-1')
    const op = captured[0]
    expect(op).toMatchObject({ table: 'deals', op: 'delete' })
    expect(op.eqs[0]).toEqual(['tenant_id', TENANT_A])
  })
})

describe('tenantDb — insert / upsert stamp tenant_id', () => {
  it('stamps tenant_id on a single-row insert', () => {
    tenantDb(TENANT_A).from('clients').insert({ name: 'Ada' })
    expect(captured[0].rows).toEqual({ name: 'Ada', tenant_id: TENANT_A })
  })

  it('stamps tenant_id on every row of a batch insert', () => {
    tenantDb(TENANT_A).from('clients').insert([{ name: 'Ada' }, { name: 'Bo' }])
    expect(captured[0].rows).toEqual([
      { name: 'Ada', tenant_id: TENANT_A },
      { name: 'Bo', tenant_id: TENANT_A },
    ])
  })

  it('stamps tenant_id on upsert rows', () => {
    tenantDb(TENANT_A).from('hr_employee_profiles').upsert({ member_id: 'm1' }, { onConflict: 'member_id' })
    expect(captured[0].rows).toEqual({ member_id: 'm1', tenant_id: TENANT_A })
    expect(captured[0].opts).toEqual({ onConflict: 'member_id' })
  })
})

describe('tenantDb — WRONG-TENANT PROBE (cross-tenant isolation)', () => {
  it('a query built for tenant A never carries tenant B', () => {
    tenantDb(TENANT_A).from('bookings').select('*').eq('id', 'x')
    const tenantEqs = captured[0].eqs.filter(([c]) => c === 'tenant_id')
    expect(tenantEqs).toEqual([['tenant_id', TENANT_A]])
    // the other tenant's id appears nowhere in this query
    expect(JSON.stringify(captured[0])).not.toContain(TENANT_B)
  })

  it('a forged tenant_id in an INSERT payload is overridden, not honored', () => {
    // Attacker (or a copy-paste bug) tries to write a row into tenant B while
    // operating as tenant A. The wrapper must clobber the forged id.
    tenantDb(TENANT_A).from('clients').insert({ name: 'mole', tenant_id: TENANT_B })
    expect(captured[0].rows).toEqual({ name: 'mole', tenant_id: TENANT_A })
    expect((captured[0].rows as { tenant_id: string }).tenant_id).not.toBe(TENANT_B)
  })

  it('a forged tenant_id in an UPSERT payload is overridden', () => {
    tenantDb(TENANT_A).from('clients').upsert([{ name: 'mole', tenant_id: TENANT_B }])
    expect(captured[0].rows).toEqual([{ name: 'mole', tenant_id: TENANT_A }])
  })
})
