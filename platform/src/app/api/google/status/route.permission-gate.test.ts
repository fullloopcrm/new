import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/google/status previously called getTenantForRequest() with no
 * permission check -- 'staff' (which lacks campaigns.view by default) could
 * call the API directly and read Google Business connection status, review
 * averages, and post counts even though /dashboard/google is nav-hidden for
 * that role. Now gated on campaigns.view, matching sibling GET /api/social/posts.
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

vi.mock('@/lib/google', () => ({
  getGoogleTokens: async () => null,
  getGoogleBusiness: async () => null,
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))

import { GET } from './route'

beforeEach(() => { currentRole.value = 'staff' })

describe('GET /api/google/status — permission gate', () => {
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
