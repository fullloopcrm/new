import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH/DELETE /api/recurring-expenses/[id] previously called
 * getTenantForRequest() with no requirePermission check -- any authenticated
 * tenant member (incl. 'staff', which lacks finance.expenses) could edit or
 * delete a recurring expense obligation. Now gated on finance.expenses.
 * Ported from sibling-branch commit 120dd9ff.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const EXPENSE_ID = 'exp-1'

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
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (op === 'delete') { DB[table] = rowsOf().filter((r) => !filters.every((f) => f(r))); return Promise.resolve(res({ data: null, error: null })) }
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

import { PATCH, DELETE } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.recurring_expenses = [{ id: EXPENSE_ID, tenant_id: TENANT_A, label: 'Rent', amount_cents: 100000, active: true }]
})

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = Promise.resolve({ id: EXPENSE_ID })

describe('/api/recurring-expenses/[id] — permission gate', () => {
  it('403s a staff member on PATCH, row untouched', async () => {
    const res = await PATCH(patchReq({ label: 'Renamed' }), { params })
    expect(res.status).toBe(403)
    expect(DB.recurring_expenses[0].label).toBe('Rent')
  })

  it('403s a staff member on DELETE, row survives', async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), { params })
    expect(res.status).toBe(403)
    expect(DB.recurring_expenses.length).toBe(1)
  })

  it('allows an admin (has finance.expenses) to PATCH', async () => {
    currentRole.value = 'admin'
    const res = await PATCH(patchReq({ label: 'Renamed' }), { params })
    expect(res.status).toBe(200)
    expect(DB.recurring_expenses[0].label).toBe('Renamed')
  })
})
