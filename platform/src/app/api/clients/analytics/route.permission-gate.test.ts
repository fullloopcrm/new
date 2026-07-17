import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients/analytics called getTenantForRequest() with zero
 * permission check -- exposes per-client LTV and lifecycle data. Now gated
 * on clients.view, matching /api/clients and its other siblings.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  bookings: [
    { tenant_id: TENANT_A, client_id: 'c1', price: 100, start_time: new Date().toISOString(), status: 'completed', clients: { name: 'Jane Doe' } },
  ],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ active_client_threshold_days: 30, at_risk_threshold_days: 90 }),
}))

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

describe('GET /api/clients/analytics — permission gate', () => {
  it('403s a role with clients.view revoked via RBAC override', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = { staff: { 'clients.view': false } }
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff, which has clients.view by default', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.totalClients).toBe(1)
  })
})
