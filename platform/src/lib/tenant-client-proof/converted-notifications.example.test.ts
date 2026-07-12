import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for GET /api/notifications: the LIST, the unread COUNT and the conditional
 * mark-read UPDATE all flow through ONE tenantClient(tenantId). Asserts scope on the reads,
 * the JSON-path `.is('metadata->read', null)` unread filter, the 50-row cap, and — the new
 * bit — that the WRITE also rides the same scoped client (so RLS covers it at cutover) and
 * only fires when `markRead` is true and there are ids.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listNotificationsConverted } from './converted-notifications.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

type QueryRecord = {
  table: string
  selects: Array<[string, unknown]>
  eqs: Array<[string, unknown]>
  is: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  limits: number[]
  updates: unknown[]
  ins: Array<[string, unknown]>
}

/** FIFO recorder: each `.from()` shifts the next result off `results` (call order). */
function makeRecordingDb(results: unknown[]) {
  const calls: QueryRecord[] = []
  const queue = [...results]
  const db = {
    from(table: string) {
      const rec: QueryRecord = {
        table, selects: [], eqs: [], is: [], orders: [], limits: [], updates: [], ins: [],
      }
      calls.push(rec)
      const result = queue.shift() ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string, opts?: unknown) => { rec.selects.push([cols, opts]); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.is = (col: string, val: unknown) => { rec.is.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
      builder.limit = (n: number) => { rec.limits.push(n); return builder }
      builder.update = (payload: unknown) => { rec.updates.push(payload); return builder }
      builder.in = (col: string, vals: unknown) => { rec.ins.push([col, vals]); return builder }
      builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        if (result instanceof Error) return reject(result)
        return resolve(result)
      }
      return builder
    },
  }
  return { db, calls }
}

const listRes = (rows: unknown[]) => ({ data: rows, error: null })
const countRes = (n: number) => ({ count: n, error: null })
const updateRes = () => ({ data: null, error: null })

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('listNotificationsConverted (GET /api/notifications)', () => {
  it('routes LIST + COUNT through ONE tenantClient; scope, order, limit(50) preserved', async () => {
    const rows = [{ id: 'n1', tenant_id: TENANT }, { id: 'n2', tenant_id: TENANT }]
    const { db, calls } = makeRecordingDb([listRes(rows), countRes(2)])
    tenantClientMock.mockReturnValue(db)

    const res = await listNotificationsConverted(TENANT, false)

    expect(tenantClientMock).toHaveBeenCalledTimes(1) // one client serves both reads
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const list = calls[0]
    expect(list.table).toBe('notifications')
    expect(list.eqs).toContainEqual(['tenant_id', TENANT])
    expect(list.eqs).toContainEqual(['recipient_type', 'admin'])
    expect(list.orders).toEqual([['created_at', { ascending: false }]])
    expect(list.limits).toEqual([50])
    expect(res).toEqual({ notifications: rows, unread: 2 })
  })

  it('unread COUNT is head-only and uses the JSON-path .is(metadata->read, null) filter', async () => {
    const { db, calls } = makeRecordingDb([listRes([]), countRes(7)])
    tenantClientMock.mockReturnValue(db)

    const res = await listNotificationsConverted(TENANT, false)

    const count = calls[1]
    expect(count.selects).toEqual([['id', { count: 'exact', head: true }]])
    expect(count.is).toContainEqual(['metadata->read', null])
    expect(count.eqs).toContainEqual(['tenant_id', TENANT])
    expect(res.unread).toBe(7)
  })

  it('mark_read=true fires the UPDATE on the SAME scoped client, scoped by id from the LIST', async () => {
    const rows = [{ id: 'n1', tenant_id: TENANT }, { id: 'n2', tenant_id: TENANT }]
    const { db, calls } = makeRecordingDb([listRes(rows), countRes(2), updateRes()])
    tenantClientMock.mockReturnValue(db)

    await listNotificationsConverted(TENANT, true)

    expect(tenantClientMock).toHaveBeenCalledTimes(1) // still ONE client for read + write
    const update = calls[2]
    expect(update.table).toBe('notifications')
    expect(update.updates).toEqual([{ metadata: { read: true } }])
    expect(update.ins).toEqual([['id', ['n1', 'n2']]])
  })

  it('mark_read=true with NO rows does NOT issue an UPDATE', async () => {
    const { db, calls } = makeRecordingDb([listRes([]), countRes(0)])
    tenantClientMock.mockReturnValue(db)

    await listNotificationsConverted(TENANT, true)

    // Only LIST + COUNT ran; no third (update) call.
    expect(calls).toHaveLength(2)
    expect(calls.some((c) => c.updates.length > 0)).toBe(false)
  })

  it('mark_read=false never issues an UPDATE', async () => {
    const rows = [{ id: 'n1', tenant_id: TENANT }]
    const { db, calls } = makeRecordingDb([listRes(rows), countRes(1)])
    tenantClientMock.mockReturnValue(db)

    await listNotificationsConverted(TENANT, false)

    expect(calls).toHaveLength(2)
    expect(calls.some((c) => c.updates.length > 0)).toBe(false)
  })

  it('ignores the COUNT error (unread → 0), faithful to live', async () => {
    const { db } = makeRecordingDb([listRes([]), { count: null, error: new Error('count failed') }])
    tenantClientMock.mockReturnValue(db)

    const res = await listNotificationsConverted(TENANT, false)
    expect(res.unread).toBe(0)
  })

  it('surfaces the LIST error (throws via `if (error) throw`), not swallowed', async () => {
    // Faithful to supabase: the error comes back in the RESOLVED object, not as a rejection;
    // the impl's `if (error) throw error` is what surfaces it.
    const { db } = makeRecordingDb([{ data: null, error: new Error('permission denied for table notifications') }])
    tenantClientMock.mockReturnValue(db)

    await expect(listNotificationsConverted(TENANT, false)).rejects.toThrow(/permission denied/)
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb([listRes([]), countRes(0)])
    tenantClientMock.mockReturnValue(db)

    await listNotificationsConverted(OTHER, false)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    expect(calls[0].eqs).toContainEqual(['tenant_id', OTHER])
    expect(calls[0].eqs).not.toContainEqual(['tenant_id', TENANT])
  })
})
