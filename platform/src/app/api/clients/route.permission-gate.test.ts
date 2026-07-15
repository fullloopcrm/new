import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients called getTenantForRequest() with zero permission check
 * while its own sibling POST already requires clients.create, and sibling
 * sub-routes (activity, contacts, export, transcript, import) already gate
 * on clients.view. A tenant whose role has had clients.view revoked via the
 * tenant's own RBAC override could still list every client's PII.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: 'c1', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@example.com' }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    range: () => c,
    or: () => c,
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
  return new NextRequest('http://localhost/api/clients')
}

describe('GET /api/clients — permission gate', () => {
  it('403s a role with clients.view revoked via RBAC override', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = { staff: { 'clients.view': false } }
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('allows staff, which has clients.view by default', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clients).toHaveLength(1)
  })
})
