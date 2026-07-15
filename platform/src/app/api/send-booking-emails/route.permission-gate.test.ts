import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/send-booking-emails previously called getTenantForRequest() with
 * zero permission check -- 'staff' (which has bookings.view/create but
 * lacks bookings.edit by default) could re-trigger confirmation emails/SMS
 * to a client and team member for any booking. Now gated on bookings.edit.
 */

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 't-1', role: currentRole.value, tenant: { id: 't-1' } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn() }))

import { POST } from './route'

beforeEach(() => { currentRole.value = 'staff' })

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/send-booking-emails — permission gate', () => {
  it('403s staff (lacks bookings.edit)', async () => {
    const res = await POST(req({ bookingId: 'b1' }))
    expect(res.status).toBe(403)
  })

  it('allows admin (has bookings.edit) through the gate (400 on missing bookingId proves gate passed)', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })
})
