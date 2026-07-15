import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

/**
 * POST /api/send-booking-emails — bookings.edit gate (broad-hunt: resending a
 * booking confirmation email/SMS to a client or team member had zero
 * permission check beyond base tenant auth via getTenantForRequest()).
 * RBAC (rbac.ts) grants 'staff' only bookings.view + bookings.create, not
 * bookings.edit — matching the sibling bookings/[id]/route.ts PUT and
 * bookings/[id]/status route, which already require bookings.edit for any
 * booking-communication mutation. 'manager'+ have bookings.edit and must
 * keep working.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 'tenant-A',
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from './route'
import { notify } from '@/lib/notify'

const postReq = (body: unknown) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.mocked(notify).mockClear()
  h.seq = 0
  h.role = 'staff'
  h.store = {
    bookings: [{
      id: 'book-A1',
      tenant_id: 'tenant-A',
      start_time: '2026-08-01T14:00:00Z',
      service_type: 'Cleaning',
      price: 10000,
      address: '123 Main St',
      clients: { id: 'client-1', name: 'Jane Doe', email: 'jane@example.com', phone: '+15550001111' },
      team_members: { id: 'member-1', name: 'Alex', email: 'alex@example.com', phone: '+15550002222' },
    }],
  }
})

describe('POST /api/send-booking-emails — bookings.edit permission', () => {
  it('rejects a staff member (no bookings.edit) with 403 and sends nothing', async () => {
    const res = await POST(postReq({ bookingId: 'book-A1' }))

    expect(res.status).toBe(403)
    expect(notify).not.toHaveBeenCalled()
  })

  it('allows a manager (has bookings.edit) to trigger the resend', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ bookingId: 'book-A1' }))

    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalled()
  })

  it('allows an owner to trigger the resend', async () => {
    h.role = 'owner'
    const res = await POST(postReq({ bookingId: 'book-A1' }))

    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalled()
  })
})
