import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT/DELETE /api/settings/services/[id] previously called
 * getTenantForRequest() with no requirePermission check -- any authenticated
 * tenant member (incl. 'staff', which lacks settings.edit) could rename,
 * reprice, or delete a service offering. Now gated on settings.edit. Ported
 * from sibling-branch commit 120dd9ff.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const SERVICE_ID = 'svc-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'update' | 'delete' = 'select'
  let payload: Row = {}
  const c: Record<string, unknown> = {
    update: (p: Row) => { op = 'update'; payload = p; return c },
    delete: () => { op = 'delete'; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    select: () => c,
    single: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      if (!row) return { data: null, error: { message: 'not found' } }
      if (op === 'update') Object.assign(row, payload)
      return { data: row, error: null }
    },
  }
  c.then = (res: (v: { data: unknown; error: unknown }) => unknown) => {
    if (op === 'delete') { DB[table] = rowsOf().filter((r) => !filters.every((f) => f(r))); return Promise.resolve(res({ data: null, error: null })) }
    return Promise.resolve(res({ data: null, error: null }))
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { PUT, DELETE } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.service_types = [{ id: SERVICE_ID, tenant_id: TENANT_A, name: 'Standard Clean', price_cents: 10000 }]
})

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = Promise.resolve({ id: SERVICE_ID })

describe('/api/settings/services/[id] — permission gate', () => {
  it('403s a staff member on PUT, row untouched', async () => {
    const res = await PUT(putReq({ price_cents: 1 }), { params })
    expect(res.status).toBe(403)
    expect(DB.service_types[0].price_cents).toBe(10000)
  })

  it('403s a staff member on DELETE, row survives', async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params })
    expect(res.status).toBe(403)
    expect(DB.service_types.length).toBe(1)
  })

  it('allows an admin (has settings.edit) to PUT', async () => {
    currentRole.value = 'admin'
    const res = await PUT(putReq({ price_cents: 1 }), { params })
    expect(res.status).toBe(200)
    expect(DB.service_types[0].price_cents).toBe(1)
  })
})
