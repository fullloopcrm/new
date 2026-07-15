import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients/[id] called getTenantForRequest() with zero permission
 * check while its own siblings PUT (clients.edit) and DELETE (clients.delete)
 * already gate. A tenant whose role has had clients.view revoked via the
 * tenant's own RBAC override could still read a single client's full PII.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_ID = 'c1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: CLIENT_ID, tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@example.com' }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const { tenantState } = vi.hoisted(() => ({
  tenantState: { role: 'staff' as string, overrides: null as Record<string, unknown> | null },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_A,
    role: tenantState.role,
    tenant: { selena_config: tenantState.overrides ? { role_permissions: tenantState.overrides } : {} },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

function params() {
  return { params: Promise.resolve({ id: CLIENT_ID }) }
}

describe('GET /api/clients/[id] — permission gate', () => {
  it('403s a role with clients.view revoked via RBAC override', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = { staff: { 'clients.view': false } }
    const res = await GET(new Request('http://localhost'), params())
    expect(res.status).toBe(403)
  })

  it('allows staff, which has clients.view by default', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await GET(new Request('http://localhost'), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.id).toBe(CLIENT_ID)
  })
})
