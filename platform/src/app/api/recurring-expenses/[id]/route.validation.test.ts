import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/recurring-expenses/[id] had no length cap on label/category/notes
 * and no validation that amount_cents is a positive integer or frequency is a
 * known value -- same class fixed on the POST sibling in route.ts (see that
 * file's comment for the ledger sign-flip / cron silent-default reasoning).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const EXPENSE_ID = 'exp-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'update' = 'select'
  let payload: Row = {}
  const c: Record<string, unknown> = {
    update: (p: Row) => { op = 'update'; payload = p; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    select: () => c,
    single: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      if (!row) return { data: null, error: { message: 'not found' } }
      if (op === 'update') Object.assign(row, payload)
      return { data: row, error: null }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { PATCH } from './route'

beforeEach(() => {
  DB.recurring_expenses = [{ id: EXPENSE_ID, tenant_id: TENANT_A, label: 'Rent', amount_cents: 100000, frequency: 'monthly', active: true }]
})

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = Promise.resolve({ id: EXPENSE_ID })

describe('/api/recurring-expenses/[id] — input validation', () => {
  it('400s a negative amount_cents instead of posting a sign-flipped ledger entry', async () => {
    const res = await PATCH(patchReq({ amount_cents: -50000 }), { params })
    expect(res.status).toBe(400)
    expect(DB.recurring_expenses[0].amount_cents).toBe(100000)
  })

  it('400s an unrecognized frequency', async () => {
    const res = await PATCH(patchReq({ frequency: 'fortnightly' }), { params })
    expect(res.status).toBe(400)
    expect(DB.recurring_expenses[0].frequency).toBe('monthly')
  })

  it('400s an oversized label', async () => {
    const res = await PATCH(patchReq({ label: 'x'.repeat(201) }), { params })
    expect(res.status).toBe(400)
    expect(DB.recurring_expenses[0].label).toBe('Rent')
  })

  it('allows a valid partial update', async () => {
    const res = await PATCH(patchReq({ label: 'Rent (renewed)' }), { params })
    expect(res.status).toBe(200)
    expect(DB.recurring_expenses[0].label).toBe('Rent (renewed)')
  })
})
