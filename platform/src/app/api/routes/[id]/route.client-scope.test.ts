import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/routes/[id] previously wrote `body.team_member_id` verbatim
 * with no check that it belongs to the authenticated tenant. GET joins
 * team_members(name, phone, home_latitude, home_longitude), so a foreign id
 * let a staff member of tenant A pull another tenant's staff PII into their
 * own route (same class already fixed on the sibling POST /api/routes).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'
const ROUTE_ID = 'route-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
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
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { PATCH as UPDATE } from '@/app/api/routes/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/routes/${ROUTE_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/routes/[id] — team_member_id tenant scoping', () => {
  beforeEach(() => {
    store.routes = [{ id: ROUTE_ID, tenant_id: TENANT, team_member_id: null, status: 'draft' }]
    store.bookings = []
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT },
    ]
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: FOREIGN_MEMBER }), { params: Promise.resolve({ id: ROUTE_ID }) })
    expect(res.status).toBe(404)
    expect(store.routes[0].team_member_id).toBe(null)
  })

  it('accepts a team_member_id belonging to the authenticated tenant', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: OWN_MEMBER }), { params: Promise.resolve({ id: ROUTE_ID }) })
    expect(res.status).toBe(200)
    expect(store.routes[0].team_member_id).toBe(OWN_MEMBER)
  })

  it('accepts updates that do not touch team_member_id', async () => {
    const res = await UPDATE(jsonReq({ status: 'started' }), { params: Promise.resolve({ id: ROUTE_ID }) })
    expect(res.status).toBe(200)
    expect(store.routes[0].status).toBe('started')
  })
})
