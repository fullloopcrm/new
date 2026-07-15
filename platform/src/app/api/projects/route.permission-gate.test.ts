import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/projects called getTenantForRequest() with zero permission check
 * while its own sibling POST already requires bookings.create. A tenant whose
 * role has had bookings.view revoked via the tenant's own RBAC override could
 * still list every project (client name, dates, stage).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  projects: [{ id: 'p1', tenant_id: TENANT_A, title: 'Backyard Reno', start_date: '2026-08-01', end_date: '2026-08-10' }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: rows, error: null }))
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

describe('GET /api/projects — permission gate', () => {
  it('403s a role with bookings.view revoked via RBAC override', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = { staff: { 'bookings.view': false } }
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff, which has bookings.view by default', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toHaveLength(1)
  })
})
