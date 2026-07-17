import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 follow-up to the permission-gate test: that test proves the route's
 * pre-checks (payment_status==='paid' blocks check-out undo; check_out_time
 * blocks check-in undo) reject a request when the SELECT snapshot already
 * shows the blocking state. It does NOT prove anything about a concurrent
 * write landing in the gap between that SELECT and this route's own
 * UPDATE -- a payment (webhook, admin mark-paid) or a concurrent check-out
 * happening in that exact gap would, with only a pre-check and no
 * conditional WHERE on the write itself, still let the undo through and
 * silently corrupt an already-settled booking.
 *
 * Simulates the race organically: the fake DB's SELECT step mutates the
 * underlying row (standing in for a concurrent webhook/checkout) as a side
 * effect of returning the pre-check's stale snapshot, then the route's own
 * write attempts to act on that now-stale snapshot. Proves the UPDATE's own
 * `.neq('payment_status','paid')` / `.is('check_out_time', null)` guards,
 * not just the earlier SELECT-based pre-check, are what actually stop the
 * write.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'bk-race'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const raceFlip: { mutate: ((row: Row) => void) | null } = { mutate: null }

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'insert' | 'update' = 'select'
  let payload: Row = {}
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    update: (p: Row) => { op = 'update'; payload = p; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    is: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      if (op === 'insert') { const row = { ...payload }; DB[table] = [...rowsOf(), row]; return { data: row, error: null } }
      const row = matched()[0]
      if (!row) return { data: null, error: { message: 'not found' } }
      // Snapshot BEFORE the race mutation lands, mirroring a real SELECT
      // that reads the pre-race state -- then the concurrent write mutates
      // the live row afterward, exactly the gap the route's atomic write
      // guard exists to close.
      const snapshot = { ...row }
      if (op === 'select' && table === 'bookings' && row.id === BOOKING_ID && raceFlip.mutate) {
        raceFlip.mutate(row)
      }
      if (op === 'update') Object.assign(row, payload)
      return { data: op === 'select' ? snapshot : row, error: null }
    },
    maybeSingle: async () => {
      if (op === 'insert') { const row = { ...payload }; DB[table] = [...rowsOf(), row]; return { data: row, error: null } }
      const row = matched()[0]
      if (row && op === 'update') Object.assign(row, payload)
      return { data: row ?? null, error: null }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

beforeEach(() => {
  DB.bookings = []
  DB.notifications = []
  raceFlip.mutate = null
})

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/bookings/[id]/reset — atomic race guard', () => {
  it('check-out undo: 409s instead of reverting when payment lands between the pre-check read and the write', async () => {
    DB.bookings.push({
      id: BOOKING_ID, tenant_id: TENANT_A, status: 'completed',
      check_out_time: '2026-07-15T10:00:00Z', payment_status: 'unpaid',
    })
    raceFlip.mutate = (row) => { row.payment_status = 'paid' }

    const res = await POST(req({ stage: 'check-out' }), { params: Promise.resolve({ id: BOOKING_ID }) })

    expect(res.status).toBe(409)
    const row = DB.bookings.find((r) => r.id === BOOKING_ID)
    expect(row?.status).toBe('completed')
    expect(row?.check_out_time).toBe('2026-07-15T10:00:00Z')
  })

  it('check-out undo control: still succeeds when nothing races', async () => {
    DB.bookings.push({
      id: BOOKING_ID, tenant_id: TENANT_A, status: 'completed',
      check_out_time: '2026-07-15T10:00:00Z', payment_status: 'unpaid',
    })
    raceFlip.mutate = null

    const res = await POST(req({ stage: 'check-out' }), { params: Promise.resolve({ id: BOOKING_ID }) })

    expect(res.status).toBe(200)
    expect(DB.bookings.find((r) => r.id === BOOKING_ID)?.check_out_time).toBe(null)
  })

  it('check-in undo: 409s instead of corrupting state when a check-out lands between the pre-check read and the write', async () => {
    DB.bookings.push({
      id: BOOKING_ID, tenant_id: TENANT_A, status: 'in_progress',
      check_in_time: '2026-07-15T09:00:00Z', check_out_time: null, payment_status: 'unpaid',
    })
    raceFlip.mutate = (row) => { row.check_out_time = '2026-07-15T10:30:00Z'; row.status = 'completed' }

    const res = await POST(req({ stage: 'check-in' }), { params: Promise.resolve({ id: BOOKING_ID }) })

    expect(res.status).toBe(409)
    const row = DB.bookings.find((r) => r.id === BOOKING_ID)
    expect(row?.status).toBe('completed')
    expect(row?.check_in_time).toBe('2026-07-15T09:00:00Z')
  })

  it('check-in undo control: still succeeds when nothing races', async () => {
    DB.bookings.push({
      id: BOOKING_ID, tenant_id: TENANT_A, status: 'in_progress',
      check_in_time: '2026-07-15T09:00:00Z', check_out_time: null, payment_status: 'unpaid',
    })
    raceFlip.mutate = null

    const res = await POST(req({ stage: 'check-in' }), { params: Promise.resolve({ id: BOOKING_ID }) })

    expect(res.status).toBe(200)
    expect(DB.bookings.find((r) => r.id === BOOKING_ID)?.check_in_time).toBe(null)
  })
})
