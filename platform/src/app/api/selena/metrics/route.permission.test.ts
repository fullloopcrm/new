import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/selena/metrics — settings.view gate (broad-hunt companion to the
 * already-fixed /api/selena route). Session-auth only, no requirePermission
 * check, despite feeding the same settings.view-gated /dashboard/selena
 * scoreboard.
 */

const h = vi.hoisted(() => ({ role: 'staff' as string }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'tenant-A', tenant: {}, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/selena/metrics', () => ({
  getTenantMetrics: vi.fn(async () => ({ total: 0 })),
}))

import { GET } from './route'

beforeEach(() => {
  h.role = 'staff'
})

describe('GET /api/selena/metrics — settings.view permission', () => {
  it('rejects a staff member (no settings.view) with 403', async () => {
    const res = await GET(new Request('http://x') as never)
    expect(res.status).toBe(403)
  })

  it('allows an admin (has settings.view) to view metrics', async () => {
    h.role = 'admin'
    const res = await GET(new Request('http://x') as never)
    expect(res.status).toBe(200)
  })
})
