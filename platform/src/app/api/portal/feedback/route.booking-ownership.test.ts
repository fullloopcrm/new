import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/portal/feedback previously inserted a client-supplied booking_id
 * into reviews.booking_id verbatim, with no check that the booking belonged
 * to the calling client (tenantDb only scopes reads/writes by tenant_id, not
 * by client ownership) — a logged-in client could attach their review to
 * another client's booking within the same tenant.
 */

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
const CALLER_CLIENT = 'client-a'
const OWN_BOOKING = 'booking-own-1'
const FOREIGN_CLIENT_BOOKING = 'booking-other-client-1'
const FOREIGN_TENANT_BOOKING = 'booking-other-tenant-1'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}

function builder(table: string) {
  const eqs: Row = {}
  let insertedRow: Row | null = null
  const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    insert: (row: Row) => { insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }; return chain },
    single: async () => {
      if (insertedRow) {
        store[table] = [...(store[table] || []), insertedRow]
        return { data: insertedRow, error: null }
      }
      const found = (store[table] || []).find(match)
      return { data: found ?? null, error: found ? null : { message: 'not found' } }
    },
    maybeSingle: async () => {
      const found = (store[table] || []).find(match)
      return { data: found ?? null, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let currentAuth: { id: string; tid: string } | null

vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { POST } from './route'

beforeEach(() => {
  store.reviews = []
  store.bookings = [
    { id: OWN_BOOKING, tenant_id: TENANT, client_id: CALLER_CLIENT },
    { id: FOREIGN_CLIENT_BOOKING, tenant_id: TENANT, client_id: 'client-b' },
    { id: FOREIGN_TENANT_BOOKING, tenant_id: OTHER_TENANT, client_id: CALLER_CLIENT },
  ]
  currentAuth = { id: CALLER_CLIENT, tid: TENANT }
})

function reqWith(body: Record<string, unknown>): Request {
  return new Request('http://x/api/portal/feedback', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/portal/feedback — booking_id ownership', () => {
  it('rejects a booking_id belonging to a different client in the same tenant', async () => {
    const res = await POST(reqWith({ rating: 5, booking_id: FOREIGN_CLIENT_BOOKING }))
    expect(res.status).toBe(404)
    expect(store.reviews.length).toBe(0)
  })

  it('rejects a booking_id belonging to another tenant entirely', async () => {
    const res = await POST(reqWith({ rating: 5, booking_id: FOREIGN_TENANT_BOOKING }))
    expect(res.status).toBe(404)
    expect(store.reviews.length).toBe(0)
  })

  it('accepts a booking_id genuinely owned by the caller', async () => {
    const res = await POST(reqWith({ rating: 5, booking_id: OWN_BOOKING }))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.review.booking_id).toBe(OWN_BOOKING)
  })

  it('still succeeds with no booking_id supplied', async () => {
    const res = await POST(reqWith({ rating: 5 }))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.review.booking_id).toBe(null)
  })
})
