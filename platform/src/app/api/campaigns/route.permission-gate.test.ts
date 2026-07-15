import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/campaigns called getTenantForRequest() with zero permission
 * check while its own sibling POST already requires campaigns.create.
 * staff has NO campaigns.* permission by default -- this was a full authz
 * gap, not just an RBAC-override edge case.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  campaigns: [{ id: 'camp1', tenant_id: TENANT_A, name: 'Spring Promo', subject: 'Hi', body: 'text' }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

describe('GET /api/campaigns — permission gate', () => {
  it('403s staff (no campaigns.view by default)', async () => {
    currentRole.value = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows manager (has campaigns.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaigns).toHaveLength(1)
  })
})
