import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT/DELETE /api/sales-applications (approve/reject/remove a commission
 * sales-partner application) were gated on `team.view` instead of
 * `team.edit` — the sibling routes /api/team-applications and
 * /api/management-applications gate the identical status-change/delete
 * action on `team.edit` (see the comment at management-applications/
 * route.ts:14-16: "matches the identical sibling ... gated the same way").
 * `manager` and `staff` both have `team.view` by default but NOT
 * `team.edit`, so a view-only role could approve/reject/delete sales
 * applications — a real write action that provisions a commission-based
 * sales partner. Fixed by requiring `team.edit` on both, matching the
 * sibling routes.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'update' | 'delete' = 'select'
  let payload: Row = {}
  const c: Record<string, unknown> = {
    select: () => c,
    update: (p: Row) => { op = 'update'; payload = p; return c },
    delete: () => { op = 'delete'; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      if (op === 'update') {
        const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
        rows.forEach((r) => Object.assign(r, payload))
        return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } }
      }
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (op === 'delete') {
        DB[table] = rowsOf().filter((r) => !filters.every((f) => f(r)))
        return Promise.resolve(res({ data: null, error: null }))
      }
      return Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 100 }) }))

import { PUT, DELETE } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.sales_applications = [{ id: 'app-1', tenant_id: TENANT_A, status: 'pending', email: 'a@x.com' }]
})

const putReq = (body: unknown) => new Request('http://x/api/sales-applications', { method: 'PUT', body: JSON.stringify(body) })
const deleteReq = (id: string) => new Request(`http://x/api/sales-applications?id=${id}`, { method: 'DELETE' })

describe('/api/sales-applications — permission gate (PUT/DELETE require team.edit)', () => {
  it('403s a staff member (team.view only) approving an application, row untouched', async () => {
    const res = await PUT(putReq({ id: 'app-1', status: 'approved' }))
    expect(res.status).toBe(403)
    expect(DB.sales_applications[0].status).toBe('pending')
  })

  it('403s a manager (team.view only, no team.edit) approving an application', async () => {
    currentRole.value = 'manager'
    const res = await PUT(putReq({ id: 'app-1', status: 'approved' }))
    expect(res.status).toBe(403)
    expect(DB.sales_applications[0].status).toBe('pending')
  })

  it('403s a staff member deleting an application, row survives', async () => {
    const res = await DELETE(deleteReq('app-1'))
    expect(res.status).toBe(403)
    expect(DB.sales_applications.length).toBe(1)
  })

  it('allows an admin (has team.edit) to approve and delete', async () => {
    currentRole.value = 'admin'
    const putRes = await PUT(putReq({ id: 'app-1', status: 'approved' }))
    expect(putRes.status).toBe(200)
    expect(DB.sales_applications[0].status).toBe('approved')
    const delRes = await DELETE(deleteReq('app-1'))
    expect(delRes.status).toBe(200)
    expect(DB.sales_applications.length).toBe(0)
  })
})
