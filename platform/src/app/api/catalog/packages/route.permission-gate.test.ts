import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/catalog/packages mirrors the sales.edit gate already enforced on the
 * sibling /api/catalog route for the same "who can price things" surface --
 * GET (read-only) is open to any tenant member, mutations require sales.edit.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<[string, unknown]> = []
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
  DB.catalog_packages = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const deleteReq = (id: string) => new Request(`http://x?id=${id}`, { method: 'DELETE' })

describe('/api/catalog/packages — permission gate', () => {
  it('allows a staff member on GET (no gate, read-only)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('403s a staff member creating a package, no row inserted', async () => {
    const res = await POST(postReq({ name: 'Move-In Deep Clean' }))
    expect(res.status).toBe(403)
    expect(DB.catalog_packages.length).toBe(0)
  })

  it('403s a staff member editing a package, no row updated', async () => {
    DB.catalog_packages = [{ id: 'pkg-1', tenant_id: TENANT_A, name: 'Original', items: [] }]
    const res = await PATCH(patchReq({ id: 'pkg-1', name: 'Renamed' }))
    expect(res.status).toBe(403)
    expect(DB.catalog_packages[0].name).toBe('Original')
  })

  it('403s a staff member deleting a package, row survives', async () => {
    DB.catalog_packages = [{ id: 'pkg-1', tenant_id: TENANT_A, name: 'Original' }]
    const res = await DELETE(deleteReq('pkg-1'))
    expect(res.status).toBe(403)
    expect(DB.catalog_packages.length).toBe(1)
  })

  it('allows a manager (has sales.edit) to create, edit, and delete', async () => {
    currentRole.value = 'manager'
    const createRes = await POST(postReq({
      name: 'Move-In Deep Clean',
      description: 'Everything for move-in day.',
      items: [{ catalog_item_id: 'svc-1', name: 'Deep Clean', description: 'Full unit deep clean', quantity: 1, unit_price_cents: 25000 }],
    }))
    expect(createRes.status).toBe(200)
    expect(DB.catalog_packages.length).toBe(1)
    const id = DB.catalog_packages[0].id as string

    const editRes = await PATCH(patchReq({ id, name: 'Renamed Package' }))
    expect(editRes.status).toBe(200)
    expect(DB.catalog_packages[0].name).toBe('Renamed Package')

    const deleteRes = await DELETE(deleteReq(id))
    expect(deleteRes.status).toBe(200)
    expect(DB.catalog_packages.length).toBe(0)
  })

  it('caps oversized items array and strips items missing a name', async () => {
    currentRole.value = 'manager'
    const items = Array.from({ length: 150 }, (_, i) => ({ name: `Item ${i}`, quantity: 1, unit_price_cents: 100 }))
    items.push({ name: '', quantity: 1, unit_price_cents: 100 } as unknown as (typeof items)[number])
    const res = await POST(postReq({ name: 'Big Package', items }))
    expect(res.status).toBe(200)
    const saved = DB.catalog_packages[0].items as unknown[]
    expect(saved.length).toBeLessThanOrEqual(100)
  })
})
