import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/clients/stats called getTenantForRequest() with zero permission
 * check -- exposes tenant-wide client counts and revenue. Now gated on
 * clients.view, matching /api/clients.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: 'c1', tenant_id: TENANT_A, status: 'active', source: 'referral', created_at: new Date().toISOString() }],
  bookings: [{ tenant_id: TENANT_A, price: 100, client_id: 'c1', payment_status: 'paid' }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let headMode = false
  const c: Record<string, unknown> = {
    select: (_sel: string, opts?: { count?: string; head?: boolean }) => {
      headMode = !!opts?.head
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: () => c,
    then: (res: (v: { data: unknown; count: number; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: headMode ? null : rows, count: rows.length, error: null }))
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

describe('GET /api/clients/stats — permission gate', () => {
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
    expect(body.total).toBe(1)
  })
})
