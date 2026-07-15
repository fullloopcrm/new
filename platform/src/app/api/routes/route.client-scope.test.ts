import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/routes previously inserted `body.team_member_id` verbatim with
 * no check that it belongs to the authenticated tenant. GET /api/routes and
 * GET /api/routes/[id] both join team_members(name, phone, home_latitude,
 * home_longitude), so a foreign id let a staff member of tenant A pull
 * another tenant's staff PII into a route stored under tenant A (same class
 * already fixed on bookings 534a5834 / admin recurring-schedules 2078383a).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        if (kind === 'update') { const rows = doUpdate(); return res({ data: rows, error: null }) }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { POST as CREATE } from '@/app/api/routes/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/routes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/routes — team_member_id tenant scoping', () => {
  beforeEach(() => {
    store.routes = []
    store.bookings = []
    store.tenants = [{ id: TENANT, hq_latitude: 40.7, hq_longitude: -74.0, address: 'HQ' }]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT, home_latitude: 40.8, home_longitude: -74.1, address: 'Own Member Rd' },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT, home_latitude: 41.0, home_longitude: -75.0, address: 'Foreign Member Rd' },
    ]
    idSeq = 0
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await CREATE(jsonReq({ route_date: '2026-08-01', team_member_id: FOREIGN_MEMBER }))
    expect(res.status).toBe(404)
    expect(store.routes.length).toBe(0)
  })

  it('accepts a team_member_id belonging to the authenticated tenant', async () => {
    const res = await CREATE(jsonReq({ route_date: '2026-08-01', team_member_id: OWN_MEMBER }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.route.team_member_id).toBe(OWN_MEMBER)
    expect(store.routes.length).toBe(1)
  })

  it('accepts route creation with no team_member_id (unassigned)', async () => {
    const res = await CREATE(jsonReq({ route_date: '2026-08-01' }))
    expect(res.status).toBe(200)
    expect(store.routes.length).toBe(1)
  })
})
