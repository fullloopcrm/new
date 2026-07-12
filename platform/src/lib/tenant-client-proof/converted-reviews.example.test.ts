import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the reviews conversion: the read (including its embedded clients(name)
 * join) flows through one tenantClient(tenantId), stays tenant-scoped, and surfaces DB errors
 * instead of swallowing them. We pin the embed shape the cross-table dependency cares about:
 * the select string names the child table, so a reviewer can see exactly which policy
 * (clients #1) must exist before this parent (#55) converts — here already satisfied by tier
 * order (child #1 precedes parent #55).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listReviewsConverted } from './converted-reviews.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; selects: string[]; eqs: Array<[string, unknown]> }

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.order = passthrough
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
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

describe('listReviewsConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scoped; embeds the clients child', async () => {
    const rows = [{ id: 'r1', rating: 5, clients: { name: 'Acme' }, tenant_id: TENANT }]
    const { db, calls } = makeRecordingDb({ reviews: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listReviewsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'reviews')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    // The embed shape the cross-table dependency depends on:
    expect(c.selects[0]).toContain('clients(')
    expect(res).toEqual(rows)
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      reviews: new Error('permission denied for table reviews'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listReviewsConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
