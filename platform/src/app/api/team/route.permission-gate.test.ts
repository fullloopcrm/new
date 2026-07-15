import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/team called getTenantForRequest() with no requirePermission
 * check at all -- unlike its own POST sibling (team.create) -- so any
 * authenticated tenant member, incl. a role with team.view revoked via
 * the tenant's own RBAC override, could list every team_members row via
 * select('*'), which includes the 4-digit team-portal PIN, pay_rate, and
 * contact info. Gated on team.view, matching /api/cleaners' GET.
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
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
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
  DB.team_members = [{ id: 'tm-1', tenant_id: TENANT_A, name: 'Jane', pin: '1234' }]
})

describe('GET /api/team — permission gate', () => {
  it('403s a role without team.view (custom override revoking it)', async () => {
    // 'staff' has team.view by default per rbac.ts, so simulate a role that lacks it.
    currentRole.value = 'nonexistent-role-with-no-perms'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff (has team.view) and does not leak other tenants', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.team).toHaveLength(1)
    expect(body.team[0].pin).toBe('1234')
  })
})
