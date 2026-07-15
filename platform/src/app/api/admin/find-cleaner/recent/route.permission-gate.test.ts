import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/admin/find-cleaner/recent previously called getTenantForRequest()
 * with zero permission check. Now gated on bookings.view (every default role
 * has this), but a tenant override revoking it from staff is now enforced,
 * where before it had no effect on this route.
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
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  overrides.value = {}
})

describe('GET /api/admin/find-cleaner/recent — permission gate', () => {
  it('staff has bookings.view by default -- passes the gate', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('403s staff when a tenant override revokes bookings.view', async () => {
    overrides.value = { staff: { 'bookings.view': false } }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
