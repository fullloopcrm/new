import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PUT /api/management-applications called getTenantForRequest() with no
 * requirePermission check at all -- unlike the identical sibling
 * /api/team-applications route (team.view for GET, team.edit for PUT) -- so
 * any authenticated tenant member, incl. a role with team.view revoked via
 * the tenant's own RBAC override, could list every applicant's PII (resume,
 * photo, selfie video, phone, email) and approve/reject applications. Gated
 * on team.view/team.edit, matching team-applications exactly.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    update: (payload: Row) => { updatePayload = payload; return c },
    single: () => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve({ data: matched[0] || null, error: null })
    },
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

import { GET, PUT } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.management_applications = [
    { id: 'app-1', tenant_id: TENANT_A, name: 'Alex', email: 'alex@example.com', resume_url: 'r.pdf', status: 'pending' },
  ]
})

describe('GET /api/management-applications — permission gate', () => {
  it('403s a role without team.view (custom override revoking it)', async () => {
    currentRole.value = 'nonexistent-role-with-no-perms'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff (has team.view by default) and returns applicant data', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].email).toBe('alex@example.com')
  })
})

describe('PUT /api/management-applications — permission gate', () => {
  function req(body: unknown) {
    return new Request('http://test/api/management-applications', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  it('403s manager (has team.view but not team.edit by default)', async () => {
    currentRole.value = 'manager'
    const res = await PUT(req({ id: 'app-1', status: 'approved' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has team.edit by default) to update status', async () => {
    currentRole.value = 'admin'
    const res = await PUT(req({ id: 'app-1', status: 'approved' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('approved')
  })
})
