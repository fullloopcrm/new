import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/admin/analytics/live-feed previously called getTenantForRequest()
 * with no permission check -- 'staff' (which lacks campaigns.view by default)
 * could call the API directly and read live visitor tracking data (domain,
 * page, referrer, device) even though this is marketing/analytics data on the
 * same fold as GET /api/google/status and GET /api/social/posts. Now gated on
 * campaigns.view.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1',
    role: currentRole.value,
    tenant: { id: 't-1', selena_config: null },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}))

import { GET } from './route'

beforeEach(() => { currentRole.value = 'staff' })

describe('GET /api/admin/analytics/live-feed — permission gate', () => {
  it('403s staff (lacks campaigns.view)', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows manager (has campaigns.view) through the gate', async () => {
    currentRole.value = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
