import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/find-cleaner/preview previously called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member could pull
 * full team-member availability/eligibility data with no gate at all. Now
 * gated on bookings.create (staff/manager/admin/owner all have this by
 * default -- dispatch-eligibility is a day-to-day scheduling action -- but a
 * tenant that revokes bookings.create via a role-permission override is now
 * actually enforced, where before the override had no effect on this route).
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
          eq: () => Promise.resolve({ data: [], error: null }),
          gte: () => ({
            lte: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
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

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const body = { job_date: '2026-08-01', start_time: '09:00', duration_hours: 2 }

describe('POST /api/admin/find-cleaner/preview — permission gate', () => {
  it('staff has bookings.create by default -- passes the gate', async () => {
    const res = await POST(req(body))
    expect(res.status).toBe(200)
  })

  it('403s staff when a tenant override revokes bookings.create', async () => {
    overrides.value = { staff: { 'bookings.create': false } }
    const res = await POST(req(body))
    expect(res.status).toBe(403)
  })
})
