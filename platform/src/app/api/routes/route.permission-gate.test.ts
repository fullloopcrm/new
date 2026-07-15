import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/routes previously called getTenantForRequest() with no
 * requirePermission check at all -- any authenticated tenant member (incl.
 * 'staff', the default role) could list every driving route (team member
 * home lat/lng + phone via the join) and create new routes, with zero RBAC
 * gate anywhere (server or client). Gated on schedules.view / schedules.edit,
 * the closest existing permission for dispatch/route planning -- staff has
 * schedules.view but not schedules.edit, matching its access to the sibling
 * schedules module.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const eqs: Row = {}
  let kind: 'read' | 'insert' = 'read'
  let payload: Row = {}
  const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { kind = 'insert'; payload = p; return c },
    eq: (col: string, val: unknown) => { eqs[col] = val; return c },
    in: () => c,
    order: () => c,
    limit: () => c,
    single: async () => {
      if (kind === 'insert') {
        const row = { id: 'route-1', ...payload }
        store[table] = [...(store[table] || []), row]
        return { data: row, error: null }
      }
      const found = (store[table] || []).find(match)
      return { data: found ?? null, error: found ? null : { message: 'not found' } }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
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

import { GET, POST } from './route'

function getReq(): Request {
  return new Request('http://t.test/api/routes')
}
function postReq(body: Row): Request {
  return new Request('http://t.test/api/routes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET/POST /api/routes — permission gate', () => {
  beforeEach(() => {
    store.routes = []
    currentRole.value = 'staff'
  })

  it('allows a staff member to list routes (staff has schedules.view)', async () => {
    currentRole.value = 'staff'
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })

  it('403s a staff member on POST (no schedules.edit) and creates nothing', async () => {
    currentRole.value = 'staff'
    const res = await POST(postReq({ route_date: '2026-08-01' }))
    expect(res.status).toBe(403)
    expect(store.routes.length).toBe(0)
  })

  it('allows a manager (has schedules.edit) to create a route', async () => {
    currentRole.value = 'manager'
    const res = await POST(postReq({ route_date: '2026-08-01' }))
    expect(res.status).toBe(200)
    expect(store.routes.length).toBe(1)
  })
})
