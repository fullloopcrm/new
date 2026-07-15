import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PUT /api/admin/schedule-issues previously called getTenantForRequest()
 * with zero permission check. GET is now gated on schedules.view (every
 * default role has this -- a tenant override revoking it from staff is now
 * enforced, where before it had no effect). PUT (resolve/dismiss an issue)
 * is now gated on schedules.edit, which 'staff' lacks by default -- a real
 * fix, since staff could previously dismiss/resolve schedule issues outright.
 */

const { currentRole, overrides } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  overrides: { value: {} as Record<string, Record<string, boolean>> },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1', selena_config: { role_permissions: overrides.value } },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'i1', status: 'resolved' }, error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}))

import { GET, PUT } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  overrides.value = {}
})

const getReq = () => new Request('http://x/api/admin/schedule-issues')
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('GET /api/admin/schedule-issues — permission gate', () => {
  it('staff has schedules.view by default -- passes the gate', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })

  it('403s staff when a tenant override revokes schedules.view', async () => {
    overrides.value = { staff: { 'schedules.view': false } }
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/admin/schedule-issues — permission gate', () => {
  it('403s staff (lacks schedules.edit)', async () => {
    const res = await PUT(putReq({ id: 'i1', status: 'resolved' }))
    expect(res.status).toBe(403)
  })

  it('allows manager (has schedules.edit) through the gate', async () => {
    currentRole.value = 'manager'
    const res = await PUT(putReq({ id: 'i1', status: 'resolved' }))
    expect(res.status).toBe(200)
  })
})
