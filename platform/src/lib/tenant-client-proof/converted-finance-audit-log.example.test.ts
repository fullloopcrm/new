import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the finance/audit-log conversion: the read flows through
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), stays scoped
 * to audit_log + tenant_id, and applies the optional filters only when present. We mock
 * tenantClient with a recording query builder and assert routing + scope + conditional
 * chaining — not the DB itself.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { auditLogConverted, type AuditLogFilters } from './converted-finance-audit-log.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]>; ranges: Array<[string, string, unknown]> }

/**
 * Chainable, awaitable fake Supabase client that records table, .eq(), and range
 * (.gte/.lte) calls. The route reassigns `q = q.eq(...)`, so every builder method must
 * return the same builder.
 */
function makeRecordingDb(result: unknown) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], ranges: [] }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.select = passthrough
      builder.order = passthrough
      builder.limit = passthrough
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.gte = (col: string, val: unknown) => {
        rec.ranges.push(['gte', col, val])
        return builder
      }
      builder.lte = (col: string, val: unknown) => {
        rec.ranges.push(['lte', col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

const NO_FILTERS: AuditLogFilters = {
  tableName: null,
  rowId: null,
  event: null,
  entityId: null,
  from: null,
  to: null,
  limit: 100,
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('auditLogConverted', () => {
  it('routes through one tenantClient(tenantId), scoped to audit_log + tenant, with no optional filters', async () => {
    const { db, calls } = makeRecordingDb({ data: [{ id: 'a1' }], error: null })
    tenantClientMock.mockReturnValue(db)

    const res = await auditLogConverted(TENANT, NO_FILTERS)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('audit_log')
    // Only the base tenant scope is applied when no filters are passed.
    expect(calls[0].eqs).toEqual([['tenant_id', TENANT]])
    expect(calls[0].ranges).toEqual([])
    expect(res).toEqual({ log: [{ id: 'a1' }] })
  })

  it('applies each optional filter exactly when present, keeping the tenant scope', async () => {
    const { db, calls } = makeRecordingDb({ data: [], error: null })
    tenantClientMock.mockReturnValue(db)

    await auditLogConverted(TENANT, {
      tableName: 'bookings',
      rowId: 'r1',
      event: 'update',
      entityId: 'e1',
      from: '2026-01-01',
      to: '2026-02-01',
      limit: 50,
    })

    const c = calls[0]
    expect(c.table).toBe('audit_log')
    expect(c.eqs).toEqual([
      ['tenant_id', TENANT],
      ['table_name', 'bookings'],
      ['row_id', 'r1'],
      ['event', 'update'],
      ['entity_id', 'e1'],
    ])
    expect(c.ranges).toEqual([
      ['gte', 'created_at', '2026-01-01'],
      ['lte', 'created_at', '2026-02-01'],
    ])
  })

  it('propagates a query error (fail-closed, no silent empty result)', async () => {
    const { db } = makeRecordingDb({ data: null, error: new Error('rls denied') })
    tenantClientMock.mockReturnValue(db)

    await expect(auditLogConverted(TENANT, NO_FILTERS)).rejects.toThrow('rls denied')
  })
})
