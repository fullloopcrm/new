import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/recurring-expenses previously called getTenantForRequest()
 * with no requirePermission check -- any authenticated tenant member (incl.
 * 'staff', which lacks finance.expenses) could see or create recurring
 * expense obligations. Now gated on finance.view/finance.expenses. Ported
 * from sibling-branch commit 120dd9ff.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  let op: 'select' | 'insert' = 'select'
  let payload: Row = {}
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    eq: () => c,
    order: () => c,
    single: async () => {
      const row = { ...payload }
      DB[table] = [...rowsOf(), row]
      return { data: row, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => Promise.resolve(res({ data: rowsOf(), error: null })),
  }
  void op
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.recurring_expenses = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('/api/recurring-expenses — permission gate', () => {
  it('403s a staff member on GET (no finance.view)', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('403s a staff member creating a recurring expense, no row inserted', async () => {
    const res = await POST(postReq({ label: 'Rent', amount_cents: 100000, frequency: 'monthly' }))
    expect(res.status).toBe(403)
    expect(DB.recurring_expenses.length).toBe(0)
  })

  it('allows an admin (has finance.view/finance.expenses) to list and create', async () => {
    currentRole.value = 'admin'
    const getRes = await GET()
    expect(getRes.status).toBe(200)
    const postRes = await POST(postReq({ label: 'Rent', amount_cents: 100000, frequency: 'monthly' }))
    expect(postRes.status).toBe(200)
    expect(DB.recurring_expenses.length).toBe(1)
  })
})
