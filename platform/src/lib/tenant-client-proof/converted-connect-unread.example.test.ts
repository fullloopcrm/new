import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the connect/unread conversion: every read flows through one
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass). We also PIN the
 * cross-table scoping gap: the parent connect_channels read is tenant-scoped, but the child
 * connect_read_cursors / connect_messages reads are scoped by reader/channel, NOT tenant —
 * the documented dependency that requires child-table policies before real conversion.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { connectUnreadConverted } from './converted-connect-unread.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const USER = 'user-7'

type QueryRecord = { table: string; eqs: Array<[string, unknown]>; gts: Array<[string, unknown]> }

/** resultsByTable value may be a fixed result or a queue (array) consumed in call order. */
function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const queues: Record<string, unknown[]> = {}
  for (const [t, v] of Object.entries(resultsByTable)) {
    if (Array.isArray(v)) queues[t] = [...v]
  }
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], gts: [] }
      calls.push(rec)
      const fixed = resultsByTable[table]
      const result = Array.isArray(fixed)
        ? (queues[table].shift() ?? { data: [], error: null, count: 0 })
        : (fixed ?? { data: [], error: null, count: 0 })
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.select = passthrough
      builder.in = passthrough
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.gt = (col: string, val: unknown) => {
        rec.gts.push([col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('connectUnreadConverted', () => {
  it('routes all reads through one tenantClient(tenantId); tenant-scopes channels; child reads scoped by channel/reader', async () => {
    const { db, calls } = makeRecordingDb({
      connect_channels: { data: [{ id: 'ch1' }, { id: 'ch2' }], error: null },
      connect_read_cursors: { data: [{ channel_id: 'ch1', last_read_at: '2026-07-10T00:00:00Z' }], error: null },
      connect_messages: [
        { count: 3, error: null }, // ch1 has unread (has cursor → .gt applied)
        { count: 0, error: null }, // ch2 has none
      ],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await connectUnreadConverted(TENANT, USER)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)

    const channelsCall = calls.find((c) => c.table === 'connect_channels')!
    expect(channelsCall.eqs).toContainEqual(['tenant_id', TENANT]) // parent is tenant-scoped

    const cursorsCall = calls.find((c) => c.table === 'connect_read_cursors')!
    expect(cursorsCall.eqs).toContainEqual(['reader_id', USER])
    expect(cursorsCall.eqs).not.toContainEqual(['tenant_id', TENANT]) // documents the gap

    const msgCalls = calls.filter((c) => c.table === 'connect_messages')
    expect(msgCalls).toHaveLength(2)
    expect(msgCalls[0].eqs).toContainEqual(['channel_id', 'ch1'])
    expect(msgCalls[0].eqs).not.toContainEqual(['tenant_id', TENANT]) // documents the gap
    expect(msgCalls[0].gts).toContainEqual(['created_at', '2026-07-10T00:00:00Z']) // cursor applied
    // ch2 has no cursor → no .gt filter.
    expect(msgCalls[1].gts).toEqual([])

    expect(res).toEqual({ unread: 1 })
  })

  it('short-circuits to unread:0 with no cursor/message reads when the tenant has no channels', async () => {
    const { db, calls } = makeRecordingDb({
      connect_channels: { data: [], error: null },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await connectUnreadConverted(TENANT, USER)

    expect(res).toEqual({ unread: 0 })
    expect(calls).toHaveLength(1) // only the channels read happened
    expect(calls.find((c) => c.table === 'connect_messages')).toBeUndefined()
  })
})
