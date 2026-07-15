import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/team/[id] called getTenantForRequest() with no requirePermission
 * check at all -- unlike its own PUT (team.edit) and DELETE (team.delete)
 * siblings -- so any authenticated tenant member, incl. a role with
 * team.view revoked via the tenant's own RBAC override, could read a
 * single team_members row, which includes the 4-digit team-portal PIN,
 * pay_rate, and contact info. Gated on team.view.
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
    single: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
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
  DB.team_members = [{ id: 'tm-1', tenant_id: TENANT_A, name: 'Jane', pin: '1234' }]
})

const getReq = () => new Request('http://x/api/team/tm-1')
const ctx = { params: Promise.resolve({ id: 'tm-1' }) }

describe('GET /api/team/[id] — permission gate', () => {
  it('403s a role without team.view', async () => {
    currentRole.value = 'nonexistent-role-with-no-perms'
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(403)
  })

  it('allows staff (has team.view)', async () => {
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-1')
  })
})
