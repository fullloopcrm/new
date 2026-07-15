import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/message-applicants/preview previously called
 * getTenantForRequest() with zero permission check. Now gated on team.view
 * (every default role has this), but a tenant override revoking it from
 * staff is now enforced, where before it had no effect on this route.
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
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  overrides.value = {}
})

describe('POST /api/admin/message-applicants/preview — permission gate', () => {
  it('staff has team.view by default -- passes the gate', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
  })

  it('403s staff when a tenant override revokes team.view', async () => {
    overrides.value = { staff: { 'team.view': false } }
    const res = await POST()
    expect(res.status).toBe(403)
  })
})
