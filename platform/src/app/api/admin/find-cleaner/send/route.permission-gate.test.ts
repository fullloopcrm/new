import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/find-cleaner/send previously called getTenantForRequest()
 * with zero permission check. Now gated on bookings.create (every default
 * role has this), but a tenant override revoking it from staff is now
 * enforced, where before it had no effect on this route. Body is
 * intentionally incomplete so an authorized call short-circuits on
 * validation (400) right after the gate, without needing to mock the full
 * SMS-send happy path.
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

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  overrides.value = {}
})

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/admin/find-cleaner/send — permission gate', () => {
  it('staff has bookings.create by default -- passes the gate (400 on incomplete body)', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('403s staff when a tenant override revokes bookings.create', async () => {
    overrides.value = { staff: { 'bookings.create': false } }
    const res = await POST(req({}))
    expect(res.status).toBe(403)
  })
})
