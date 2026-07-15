import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/audit called getTenantForRequest() with zero permission check.
 * The dashboard nav only shows the Activity page for roles with audit.view
 * (dashboard-shell.tsx), but the API itself let any authenticated tenant
 * member -- including staff/manager, which lack audit.view by default --
 * read the full tenant-scoped audit log by calling the endpoint directly,
 * bypassing the client-side-only gate.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  audit_logs: [{ id: 'log-1', tenant_id: TENANT_A, action: 'update', entity_type: 'booking', created_at: new Date().toISOString() }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    range: () => c,
    then: (res: (v: { data: unknown; count: number; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: rows, count: rows.length, error: null }))
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
import { NextRequest } from 'next/server'

function req() {
  return new NextRequest('http://localhost/api/audit')
}

describe('GET /api/audit — permission gate', () => {
  it('403s staff (no audit.view by default)', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('403s manager (no audit.view by default)', async () => {
    tenantState.role = 'manager'
    tenantState.overrides = null
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('allows admin, which has audit.view by default', async () => {
    tenantState.role = 'admin'
    tenantState.overrides = null
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.logs).toHaveLength(1)
  })
})
