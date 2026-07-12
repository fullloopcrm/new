import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the client-contacts conversion: the read (single-table scoped list
 * on client_contacts, PII) flows through one tenantClient(tenantId) and keeps BOTH scoping
 * keys — the tenant scope AND the route-param `client_id` — plus the dual mixed-direction
 * order. No cross-table dep (client_id references, does not embed, clients).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listClientContactsConverted } from './converted-client-contacts.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const CLIENT = 'c0ffee00-c0ff-4ee0-8fee-0c0ffee0c0ff'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], orders: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.order = (col: string, opts?: unknown) => {
        rec.orders.push([col, opts])
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

describe('listClientContactsConverted', () => {
  it('routes through one tenantClient(tenantId); keeps BOTH tenant AND client_id scope', async () => {
    const rows = [{ id: 'ct1', client_id: CLIENT, is_primary: true, name: 'Primary' }]
    const { db, calls } = makeRecordingDb({ client_contacts: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listClientContactsConverted(TENANT, CLIENT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'client_contacts')!
    // The route-param scope must NOT be dropped by the swap.
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.eqs).toContainEqual(['client_id', CLIENT])
    expect(c.selects[0]).toContain('phone_e164')
    expect(res).toEqual(rows)
  })

  it('keeps the dual mixed-direction order: is_primary desc, then created_at asc', async () => {
    const { db, calls } = makeRecordingDb({ client_contacts: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listClientContactsConverted(TENANT, CLIENT)

    const c = calls.find((x) => x.table === 'client_contacts')!
    expect(c.orders).toEqual([
      ['is_primary', { ascending: false }],
      ['created_at', { ascending: true }],
    ])
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ client_contacts: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listClientContactsConverted(OTHER, CLIENT)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls[0]
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('propagates a DB error (RLS default-deny on PII surfaces, is not swallowed to [])', async () => {
    const { db } = makeRecordingDb({
      client_contacts: new Error('permission denied for table client_contacts'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listClientContactsConverted(TENANT, CLIENT)).rejects.toThrow(/permission denied/)
  })
})
