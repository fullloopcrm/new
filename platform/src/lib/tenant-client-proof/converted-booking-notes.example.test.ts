import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the booking-notes conversion: the read (single-table booking_notes)
 * flows through one tenantClient(tenantId), and carries BOTH the required booking_id filter
 * AND the tenant scope, orders oldest-first, returns the bare array, and surfaces DB errors.
 * No cross-table dep.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listBookingNotesConverted } from './converted-booking-notes.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const BOOKING = 'bk_9f13'

type QueryRecord = {
  table: string
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], orders: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
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

describe('listBookingNotesConverted', () => {
  it('routes through one tenantClient(tenantId); chains BOTH booking_id AND tenant_id; oldest first; bare array', async () => {
    const rows = [{ id: 'n1', booking_id: BOOKING, content: 'first' }]
    const { db, calls } = makeRecordingDb({ booking_notes: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listBookingNotesConverted(TENANT, BOOKING)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'booking_notes')!
    expect(c.eqs).toContainEqual(['booking_id', BOOKING])
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toContainEqual(['created_at', { ascending: true }])
    // Bare array, not a { notes } envelope.
    expect(res).toEqual(rows)
  })

  it('returns [] (not null) when a booking has no notes', async () => {
    const { db } = makeRecordingDb({ booking_notes: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listBookingNotesConverted(TENANT, BOOKING)
    expect(res).toEqual([])
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed to [])', async () => {
    const { db } = makeRecordingDb({
      booking_notes: new Error('permission denied for table booking_notes'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listBookingNotesConverted(TENANT, BOOKING)).rejects.toThrow(/permission denied/)
  })
})
