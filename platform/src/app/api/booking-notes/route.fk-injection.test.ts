import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/booking-notes previously inserted `booking_id` verbatim with no
 * check that the booking belongs to the authenticated tenant, and GET had no
 * RBAC gate at all (auth-only) while POST already required bookings.edit —
 * same asymmetric-gating class fixed elsewhere (google/posts, team, etc).
 */

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
const OWN_BOOKING = 'booking-own-1'
const FOREIGN_BOOKING = 'booking-foreign-1'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { bookings: [], booking_notes: [] }
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { doInsert(); return res({ data: null, error: null }) }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { GET, POST } from './route'

function postReq(body: Row): Request {
  return new Request('http://t.test/api/booking-notes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function getReq(bookingId: string): Request {
  return new Request(`http://t.test/api/booking-notes?booking_id=${bookingId}`)
}

beforeEach(() => {
  idSeq = 0
  store.bookings = [
    { id: OWN_BOOKING, tenant_id: TENANT },
    { id: FOREIGN_BOOKING, tenant_id: OTHER_TENANT },
  ]
  store.booking_notes = []
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT }, error: null }))
})

describe('POST /api/booking-notes — booking_id tenant scoping', () => {
  it('rejects a booking_id belonging to another tenant, inserts nothing', async () => {
    const res = await POST(postReq({ booking_id: FOREIGN_BOOKING, content: 'hi' }))
    expect(res.status).toBe(404)
    expect(store.booking_notes.length).toBe(0)
  })

  it('accepts a booking_id genuinely owned by the caller tenant', async () => {
    const res = await POST(postReq({ booking_id: OWN_BOOKING, content: 'hi' }))
    expect(res.status).toBe(200)
    expect(store.booking_notes.length).toBe(1)
    expect(store.booking_notes[0].booking_id).toBe(OWN_BOOKING)
  })
})

describe('GET /api/booking-notes — RBAC gate', () => {
  it('is gated on bookings.view, not just authentication', async () => {
    h.requirePermission.mockImplementation(async () => ({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    }))
    const res = await GET(getReq(OWN_BOOKING))
    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.view')
  })
})
