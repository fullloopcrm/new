import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST/PATCH/DELETE /api/catalog previously called getTenantForRequest() with
 * no requirePermission check -- any authenticated tenant member (incl.
 * 'staff', which lacks sales.edit) could create/edit/delete catalog pricing
 * items, bypassing the sales.edit gate already enforced on the sibling CRUD
 * surface for the same service_types table (/api/settings/services). Now
 * gated on sales.edit to match.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  let filters: Array<[string, unknown]> = []
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  let payload: Row = {}
  const applyFilters = (rows: Row[]) => rows.filter((r) => filters.every(([k, v]) => r[k] === v))
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    update: (p: Row) => { op = 'update'; payload = p; return c },
    delete: () => { op = 'delete'; return c },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return c },
    order: () => c,
    single: async () => {
      if (op === 'insert') {
        const row = { id: `row-${rowsOf().length + 1}`, tenant_id: TENANT_A, ...payload }
        DB[table] = [...rowsOf(), row]
        return { data: row, error: null }
      }
      if (op === 'update') {
        const matches = applyFilters(rowsOf())
        if (matches.length === 0) return { data: null, error: { message: 'not found' } }
        Object.assign(matches[0], payload)
        return { data: matches[0], error: null }
      }
      return { data: null, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (op === 'delete') {
        const keep = rowsOf().filter((r) => !filters.every(([k, v]) => r[k] === v))
        DB[table] = keep
        return Promise.resolve(res({ data: null, error: null }))
      }
      return Promise.resolve(res({ data: applyFilters(rowsOf()), error: null }))
    },
  }
  void op
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST, PATCH, DELETE } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.service_types = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const deleteReq = (id: string) => new Request(`http://x?id=${id}`, { method: 'DELETE' })

describe('/api/catalog — permission gate', () => {
  it('allows a staff member on GET (no gate, read-only pricing catalog)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('403s a staff member creating a catalog item, no row inserted', async () => {
    const res = await POST(postReq({ name: 'Deep Clean' }))
    expect(res.status).toBe(403)
    expect(DB.service_types.length).toBe(0)
  })

  it('403s a staff member editing a catalog item, no row updated', async () => {
    DB.service_types = [{ id: 'svc-1', tenant_id: TENANT_A, name: 'Basic Clean', price_cents: 10000 }]
    const res = await PATCH(patchReq({ id: 'svc-1', price_cents: 999999 }))
    expect(res.status).toBe(403)
    expect(DB.service_types[0].price_cents).toBe(10000)
  })

  it('403s a staff member deleting a catalog item, row survives', async () => {
    DB.service_types = [{ id: 'svc-1', tenant_id: TENANT_A, name: 'Basic Clean' }]
    const res = await DELETE(deleteReq('svc-1'))
    expect(res.status).toBe(403)
    expect(DB.service_types.length).toBe(1)
  })

  it('allows a manager (has sales.edit) to create, edit, and delete', async () => {
    currentRole.value = 'manager'
    const createRes = await POST(postReq({ name: 'Deep Clean' }))
    expect(createRes.status).toBe(200)
    expect(DB.service_types.length).toBe(1)
    const id = DB.service_types[0].id as string

    const editRes = await PATCH(patchReq({ id, price_cents: 5000 }))
    expect(editRes.status).toBe(200)
    expect(DB.service_types[0].price_cents).toBe(5000)

    const deleteRes = await DELETE(deleteReq(id))
    expect(deleteRes.status).toBe(200)
    expect(DB.service_types.length).toBe(0)
  })
})
