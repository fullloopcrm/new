import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * GET /api/selena/metrics called getTenantForRequest() with zero permission
 * check, same subsystem as GET /api/selena (settings.view-gated per the
 * dashboard nav). staff does NOT have settings.view by default. Now gated to
 * match.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/selena/metrics', () => ({
  getTenantMetrics: async () => ({ total: 0 }),
}))

import { GET } from './route'

function req(): NextRequest {
  return new NextRequest('http://localhost/api/selena/metrics')
}

beforeEach(() => {
  currentRole.value = 'staff'
})

describe('GET /api/selena/metrics — permission gate', () => {
  it('403s staff, who lacks settings.view by default', async () => {
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('allows manager (has settings.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET(req())
    expect(res.status).toBe(200)
  })
})
