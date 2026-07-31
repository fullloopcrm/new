import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — recurring-expenses/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') actually excludes a foreign
 * tenant's recurring expense on GET, and that POST inserts are stamped with
 * the AUTHENTICATED tenant regardless of anything in the request body.
 *
 * Also proves the RBAC fix: both verbs now call requirePermission (this
 * route previously had no permission check at all — any authenticated
 * tenant member, any role, could view/create recurring expenses).
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let insertedRow: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    insert: (row: Row) => {
      insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }
      return chain
    },
    single: async () => {
      store[table] = [...(store[table] || []), insertedRow as Row]
      return { data: insertedRow, error: null }
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: (store[table] || []).filter((r) => matches(r, eqs)), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const h = vi.hoisted(() => ({
  currentTenant: 'tenant-A',
  permissionError: null as unknown,
  requirePermission: vi.fn(),
}))
h.requirePermission.mockImplementation(async (..._args: unknown[]) =>
  h.permissionError
    ? { tenant: null, error: h.permissionError }
    : { tenant: { tenantId: h.currentTenant }, error: null },
)

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/require-permission', () => ({ requirePermission: h.requirePermission }))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    recurring_expenses: [
      { id: 'exp-a', tenant_id: 'tenant-A', label: 'Rent A', amount_cents: 500000, active: true },
      { id: 'exp-b', tenant_id: 'tenant-B', label: 'Rent B', amount_cents: 700000, active: true },
    ],
  }
  h.currentTenant = 'tenant-A'
  h.permissionError = null
  h.requirePermission.mockClear()
})

describe('recurring-expenses GET — tenantDb isolation', () => {
  it('never returns another tenant\'s recurring expense', async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.recurring_expenses.map((r: Row) => r.id)
    expect(ids).toContain('exp-a')
    expect(ids).not.toContain('exp-b')
  })
})

describe('recurring-expenses POST — tenantDb stamping', () => {
  it('stamps the new row with the authenticated tenant, not a forged body tenant_id', async () => {
    const req = new Request('http://x/api/recurring-expenses', {
      method: 'POST',
      body: JSON.stringify({ label: 'Software', amount_cents: 9900, frequency: 'monthly', tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.recurring_expense.tenant_id).toBe('tenant-A')

    h.currentTenant = 'tenant-B'
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.recurring_expenses.map((r: Row) => r.id)).not.toContain(body.recurring_expense.id)
  })
})

describe('recurring-expenses permission gate — was missing entirely', () => {
  it('GET checks finance.view', async () => {
    await GET()
    expect(h.requirePermission).toHaveBeenCalledWith('finance.view')
  })

  it('POST checks finance.expenses', async () => {
    const req = new Request('http://x/api/recurring-expenses', {
      method: 'POST',
      body: JSON.stringify({ label: 'Software', amount_cents: 9900, frequency: 'monthly' }),
    })
    await POST(req)
    expect(h.requirePermission).toHaveBeenCalledWith('finance.expenses')
  })

  it('GET returns the permission error instead of data when denied', async () => {
    h.permissionError = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
