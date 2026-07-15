import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/jobs (every job for the tenant with a per-job payment rollup --
 * contracted/paid/due/overdue -- plus a tenant-wide total) called
 * getTenantForRequest() with zero permission check. Every sibling
 * money-reconciliation endpoint (GET /api/finance/summary, /api/finance/revenue,
 * /api/finance/ar-aging, /api/invoices, ...) requires finance.view. staff does
 * NOT have finance.view by default (only manager/admin/owner do), so this was
 * a default-config privilege escalation, not just an RBAC-override gap: any
 * staff member could hit this route and read full contracted/paid/due/overdue
 * financial totals with zero permission check.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    limit: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: rows, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.jobs = []
})

describe('GET /api/jobs — permission gate', () => {
  it('403s staff, who lacks finance.view by default, no data leaked', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('403s a role lacking finance.view entirely', async () => {
    currentRole.value = 'viewer_no_perms'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows manager (has finance.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
