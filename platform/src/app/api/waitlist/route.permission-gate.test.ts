import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/waitlist (admin panel) previously called getTenantForRequest()
 * with zero permission check -- 'staff' (which lacks leads.view entirely by
 * default) could see every waitlisted lead's name/phone. Now gated on
 * leads.view. (POST is the public/unauthenticated lead-capture path from
 * /book/new and is intentionally untouched here.)
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 't-1', role: currentRole.value, tenant: { id: 't-1' } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: () => ({
      select: () => ({
        neq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
        eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
      }),
    }),
  }),
}))

import { GET } from './route'

beforeEach(() => { currentRole.value = 'staff' })

describe('GET /api/waitlist — permission gate', () => {
  it('403s staff (lacks leads.view)', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows admin (has leads.view) through the gate', async () => {
    currentRole.value = 'admin'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
