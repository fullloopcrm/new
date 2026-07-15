import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PATCH/DELETE /api/routes/[id] previously called getTenantForRequest()
 * with no requirePermission check at all -- any authenticated tenant member
 * (incl. 'staff') could edit or delete any route (and reassign/publish it via
 * the sibling endpoints) with zero RBAC gate. Gated on schedules.view /
 * schedules.edit, matching the sibling GET/POST /api/routes.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const ROUTE_ID = 'route-1'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const eqs: Row = {}
  let kind: 'read' | 'update' | 'delete' = 'read'
  let payload: Row = {}
  const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
  const c: Record<string, unknown> = {
    select: () => c,
    update: (p: Row) => { kind = 'update'; payload = p; return c },
    delete: () => { kind = 'delete'; return c },
    eq: (col: string, val: unknown) => { eqs[col] = val; return c },
    in: () => c,
    single: async () => {
      if (kind === 'update') {
        const rows = (store[table] || []).filter(match)
        rows.forEach((r) => Object.assign(r, payload))
        return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } }
      }
      const found = (store[table] || []).find(match)
      return { data: found ?? null, error: found ? null : { message: 'not found' } }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (kind === 'delete') {
        store[table] = (store[table] || []).filter((r) => !match(r))
        return res({ data: null, error: null })
      }
      const rows = (store[table] || []).filter(match)
      return res({ data: rows, error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-permission', async () => {
  const { hasPermission } = await import('@/lib/rbac')
  return {
    requirePermission: async (permission: string) => {
      if (!hasPermission(currentRole.value, permission as never)) {
        return {
          tenant: null,
          error: new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }),
        }
      }
      return { tenant: { tenantId: TENANT, role: currentRole.value, tenant: {} }, error: null }
    },
  }
})

import { GET, PATCH, DELETE } from './route'

function params() {
  return { params: Promise.resolve({ id: ROUTE_ID }) }
}
function patchReq(body: Row): Request {
  return new Request(`http://t.test/api/routes/${ROUTE_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET/PATCH/DELETE /api/routes/[id] — permission gate', () => {
  beforeEach(() => {
    store.routes = [{ id: ROUTE_ID, tenant_id: TENANT, status: 'draft' }]
    store.bookings = []
    currentRole.value = 'staff'
  })

  it('allows a staff member to read a route (staff has schedules.view)', async () => {
    const res = await GET(new Request(`http://t.test/api/routes/${ROUTE_ID}`), params())
    expect(res.status).toBe(200)
  })

  it('403s a staff member on PATCH (no schedules.edit) and leaves the route untouched', async () => {
    const res = await PATCH(patchReq({ status: 'started' }), params())
    expect(res.status).toBe(403)
    expect(store.routes[0].status).toBe('draft')
  })

  it('403s a staff member on DELETE and leaves the route in place', async () => {
    const res = await DELETE(new Request(`http://t.test/api/routes/${ROUTE_ID}`, { method: 'DELETE' }), params())
    expect(res.status).toBe(403)
    expect(store.routes.length).toBe(1)
  })

  it('allows a manager (has schedules.edit) to update the route', async () => {
    currentRole.value = 'manager'
    const res = await PATCH(patchReq({ status: 'started' }), params())
    expect(res.status).toBe(200)
    expect(store.routes[0].status).toBe('started')
  })

  it('allows an admin to delete the route', async () => {
    currentRole.value = 'admin'
    const res = await DELETE(new Request(`http://t.test/api/routes/${ROUTE_ID}`, { method: 'DELETE' }), params())
    expect(res.status).toBe(200)
    expect(store.routes.length).toBe(0)
  })
})
