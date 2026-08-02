import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/send-booking-emails — permission gate (regression, 2026-08-01).
 *
 * Live bug found while sweeping previously-uncovered routes: this route
 * triggers a real email/SMS send to a client and/or team member, but had NO
 * permission check at all -- not even the dormant-override-only kind found
 * elsewhere this session. Any authenticated tenant member of any role could
 * fire an unwanted confirmation email/SMS to any client on the tenant.
 * Fixed to require bookings.edit.
 */

const h = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  notify: vi.fn(),
}))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'bk-1',
                  start_time: '2026-08-15T09:00:00',
                  end_time: '2026-08-15T11:00:00',
                  service_type: 'Deep Clean',
                  price: 10000,
                  clients: { id: 'client-1', name: 'Pat', email: 'pat@example.com', phone: null, address: null },
                  client_properties: null,
                  team_members: { id: 'tm-1', name: 'Carl', email: 'carl@example.com', phone: null },
                },
                error: null,
              }),
          }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

const req = (body: unknown) => new Request('http://x/api/send-booking-emails', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({ tenant: { tenantId: 'tenant-A' }, error: null })
  h.notify.mockReset()
  h.notify.mockResolvedValue({ success: true })
})

describe('POST /api/send-booking-emails — permission gate', () => {
  it('calls requirePermission with bookings.edit, not some other permission', async () => {
    await POST(req({ bookingId: 'bk-1' }))

    expect(h.requirePermission).toHaveBeenCalledWith('bookings.edit')
  })

  it('sends notifications when the caller has bookings.edit', async () => {
    const res = await POST(req({ bookingId: 'bk-1' }))

    expect(res.status).toBe(200)
    expect(h.notify).toHaveBeenCalled()
  })

  it('denies the request with 403 and never sends anything when the caller lacks bookings.edit', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }),
    })

    const res = await POST(req({ bookingId: 'bk-1' }))

    expect(res.status).toBe(403)
    expect(h.notify).not.toHaveBeenCalled()
  })
})
