import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/google/reply previously called getTenantForRequest() with
 * zero permission check -- 'staff' (which has reviews.view but lacks
 * reviews.request by default) could post a live public reply to the
 * tenant's Google Business reviews. Now gated on reviews.request.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1', role: currentRole.value,
    tenant: { id: 't-1' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/google', () => ({
  getValidAccessToken: async () => 'token',
  getGoogleBusiness: async () => ({ location_name: 'accounts/1/locations/2' }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: () => ({ update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) }) },
}))

import { POST } from './route'

beforeEach(() => { currentRole.value = 'staff' })

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/google/reply — permission gate', () => {
  it('403s staff (lacks reviews.request)', async () => {
    const res = await POST(req({ reviewId: 'r1', reply: 'thanks' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has reviews.request) through the gate (500 from the unmocked live fetch is fine -- proves the gate passed)', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({ reviewId: 'r1', reply: 'thanks' }))
    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(401)
  })
})
