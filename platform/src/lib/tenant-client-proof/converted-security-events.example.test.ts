import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the security/events conversion: the read (single-table scoped list on
 * the NEW `security_events` table) flows through one tenantClient(tenantId), stays
 * tenant-scoped, orders newest-first, respects the caller-supplied limit, AND reproduces the
 * live route's error-swallow — a DB error (what an RLS default-deny looks like) renders as an
 * empty list, not a thrown 500.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listSecurityEventsConverted } from './converted-security-events.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = {
  table: string
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  limits: number[]
}

function makeRecordingDb(result: unknown) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], orders: [], limits: [] }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      builder.select = () => builder
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.order = (col: string, opts: unknown) => {
        rec.orders.push([col, opts])
        return builder
      }
      builder.limit = (n: number) => {
        rec.limits.push(n)
        return builder
      }
      builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        if (result instanceof Error) return reject(result)
        return resolve(result)
      }
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('listSecurityEventsConverted', () => {
  it('routes through tenantClient(tenantId); tenant-scoped; orders created_at desc; applies limit', async () => {
    const rows = [{ id: 'e1', event_type: 'login_failed', created_at: '2026-07-01T00:00:00Z' }]
    const { db, calls } = makeRecordingDb({ data: rows, error: null })
    tenantClientMock.mockReturnValue(db)

    const res = await listSecurityEventsConverted(TENANT, 25)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'security_events')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toContainEqual(['created_at', { ascending: false }])
    expect(c.limits).toEqual([25])
    expect(res).toEqual({ events: rows })
  })

  it('defaults limit to 50 when not supplied', async () => {
    const { db, calls } = makeRecordingDb({ data: [], error: null })
    tenantClientMock.mockReturnValue(db)

    await listSecurityEventsConverted(TENANT)

    const c = calls.find((x) => x.table === 'security_events')!
    expect(c.limits).toEqual([50])
  })

  it('ERROR-SWALLOW HAZARD: a DB error (RLS default-deny) renders as an empty list, not a throw', async () => {
    // Supabase's query builder RESOLVES with { data: null, error } on a query-level failure
    // (it does not reject) — this is what an RLS default-deny actually looks like on the wire.
    const { db } = makeRecordingDb({
      data: null,
      error: { message: 'permission denied for table security_events' },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await listSecurityEventsConverted(TENANT)

    expect(res).toEqual({ events: [] })
  })
})
