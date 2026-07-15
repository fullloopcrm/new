import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients/enriched called getTenantForRequest() with zero
 * permission check -- exposes each client's full PII, health score, LTV,
 * and preferred cleaner. Now gated on clients.view, matching /api/clients.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: 'c1', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@example.com', phone: null, address: null, status: 'active', source: null, created_at: new Date().toISOString() }],
  bookings: [],
  recurring_schedules: [],
  team_members: [],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: () => c,
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
import { NextRequest } from 'next/server'

describe('GET /api/clients/enriched — permission gate', () => {
  it('403s a role with clients.view revoked via RBAC override', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = { staff: { 'clients.view': false } }
    const res = await GET(new NextRequest('http://localhost/api/clients/enriched'))
    expect(res.status).toBe(403)
  })

  it('allows staff, which has clients.view by default', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await GET(new NextRequest('http://localhost/api/clients/enriched'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clients).toHaveLength(1)
  })
})
