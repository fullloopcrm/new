import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/schedules created the `recurring_schedules` row, then
 * batch-inserted the first 4 weeks of `bookings` with the insert's error
 * completely unchecked. If that batch insert failed (e.g. the real
 * fn_block_booking_overlap trigger rejecting the whole statement because one
 * occurrence overlaps an existing booking), the schedule row was left
 * behind: 'active', zero bookings, and the response still reported 201 with
 * a bogus bookingsCreated count. Same failure mode already fixed on the
 * sibling admin/recurring-schedules route and sale-to-recurring.ts
 * (5b173982) -- this plain schedules route was missed by that pass.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`
let failBookingsInsert = false

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' | 'delete' = 'read'
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
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      range: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown; count?: number }) => unknown) => {
        if (kind === 'insert') {
          if (table === 'bookings' && failBookingsInsert) {
            return res({ data: null, error: { message: 'duplicate key value violates unique constraint' } })
          }
          const rows = doInsert()
          return res({ data: rows, error: null })
        }
        if (kind === 'delete') {
          store[table] = (store[table] || []).filter((r) => !match(r))
          return res({ data: null, error: null })
        }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null, count: rows.length })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST as CREATE } from '@/app/api/schedules/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/schedules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/schedules — bookings batch-insert failure rollback', () => {
  beforeEach(() => {
    store.recurring_schedules = []
    store.bookings = []
    store.service_types = []
    store.clients = [{ id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' }]
    store.team_members = []
    idSeq = 0
    failBookingsInsert = false
  })

  it('does not leave an orphaned schedule when the bookings insert fails', async () => {
    failBookingsInsert = true
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(500)
    expect(store.recurring_schedules.length).toBe(0)
    expect(store.bookings.length).toBe(0)
  })

  it('control: succeeds with a real schedule + bookings when the insert does not fail', async () => {
    failBookingsInsert = false
    const res = await CREATE(jsonReq({ client_id: OWN_CLIENT, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bookingsCreated).toBeGreaterThan(0)
    expect(store.recurring_schedules.length).toBe(1)
    expect(store.bookings.length).toBe(body.bookingsCreated)
  })
})
