import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT /api/portal/bookings/[id].
 * Every query here used to carry a manual .eq('tenant_id', auth.tid). This
 * proves a client can neither READ nor CANCEL a foreign tenant's booking that
 * happens to share both the same booking id and the same client id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_ID = 'shared-client-id'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    not: (col: string, op: string, val: string) => {
      if (op === 'in') {
        const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim())
        filters.push((r) => !list.includes(r[col] as string))
      }
      return uc
    },
    select: () => uc,
    single: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
    maybeSingle: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
    insert: (row: Row) => ({ then: (resolve: (v: unknown) => unknown) => { rowsOf().push({ id: `inserted-${rowsOf().length}`, ...row }); resolve({ data: null, error: null }) } }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { GET, PUT } from './route'

beforeEach(() => {
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_A, client_id: CLIENT_ID, team_member_id: null, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'scheduled' },
    { id: BOOKING_ID, tenant_id: TENANT_B, client_id: CLIENT_ID, team_member_id: null, start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'scheduled' },
  ]
  DB.notifications = []
})

describe('GET /api/portal/bookings/[id] — tenantDb scoping', () => {
  it('never returns a foreign tenant\'s booking sharing the same booking+client id', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/bookings/' + BOOKING_ID, {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req, { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(TENANT_A)
  })
})

describe('PUT /api/portal/bookings/[id] — tenantDb scoping', () => {
  it('cancels only the caller tenant\'s booking, leaving the foreign-tenant row untouched', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/bookings/' + BOOKING_ID, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    const bookingB = DB.bookings.find((r) => r.tenant_id === TENANT_B)!
    expect(bookingA.status).toBe('cancelled')
    expect(bookingB.status).toBe('scheduled')
  })
})
