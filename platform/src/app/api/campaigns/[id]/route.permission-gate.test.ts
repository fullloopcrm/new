import { describe, it, expect, vi } from 'vitest'

/**
 * GET/PUT/DELETE /api/campaigns/[id] called getTenantForRequest() with
 * ZERO permission check on all three handlers -- including the mutating
 * PUT and DELETE. staff has no campaigns.* permission by default and
 * manager has only campaigns.view (no create/edit-equivalent), so any
 * authenticated tenant member -- including staff -- could view, edit, or
 * delete any campaign. This was a full authz gap, not an RBAC-override
 * edge case.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CAMPAIGN_ID = 'camp1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let mode: 'select' | 'delete' = 'select'
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => {
      filters.push((r) => r[col] === val)
      return c
    },
    update: (fields: Row) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      rows.forEach((r) => Object.assign(r, fields))
      return c
    },
    delete: () => {
      mode = 'delete'
      return c
    },
    single: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } })
    },
    then: (res: (v: { error: unknown }) => unknown) => {
      if (mode === 'delete') {
        const toDelete = new Set(rowsOf().filter((r) => filters.every((f) => f(r))))
        DB[table] = rowsOf().filter((r) => !toDelete.has(r))
        return Promise.resolve(res({ error: null }))
      }
      return Promise.resolve(res({ error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, PUT, DELETE } from './route'

function reset() {
  DB.campaigns = [{ id: CAMPAIGN_ID, tenant_id: TENANT_A, name: 'Spring Promo', status: 'draft' }]
}

function params() {
  return { params: Promise.resolve({ id: CAMPAIGN_ID }) }
}

describe('/api/campaigns/[id] — permission gate', () => {
  it('GET 403s staff (no campaigns.view by default)', async () => {
    reset()
    currentRole.value = 'staff'
    const res = await GET(new Request('http://localhost'), params())
    expect(res.status).toBe(403)
  })

  it('GET allows manager (has campaigns.view by default)', async () => {
    reset()
    currentRole.value = 'manager'
    const res = await GET(new Request('http://localhost'), params())
    expect(res.status).toBe(200)
  })

  it('PUT 403s manager (has campaigns.view but not campaigns.create)', async () => {
    reset()
    currentRole.value = 'manager'
    const res = await PUT(new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ name: 'x' }) }), params())
    expect(res.status).toBe(403)
  })

  it('PUT allows admin (has campaigns.create)', async () => {
    reset()
    currentRole.value = 'admin'
    const res = await PUT(new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ name: 'Updated' }) }), params())
    expect(res.status).toBe(200)
  })

  it('DELETE 403s staff (no campaigns.create by default)', async () => {
    reset()
    currentRole.value = 'staff'
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(403)
  })

  it('DELETE allows admin (has campaigns.create)', async () => {
    reset()
    currentRole.value = 'admin'
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), params())
    expect(res.status).toBe(200)
  })
})
