import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/bookings/broadcast.
 *
 * booking.notes, booking.service_type, and the client's property address are
 * all attacker-controlled: the public, unauthenticated POST /api/client/book
 * endpoint writes body.notes/body.service_type/body.address verbatim onto the
 * booking/client rows with no sanitization. This route reads those fields
 * back and interpolated them raw into the "urgent job" HTML email fanned out
 * to every active team member — unlike every other HTML-email builder in this
 * codebase (lib/email-templates.ts, lib/agreement.ts, the quotes/accept+decline
 * public routes), which all run user-controlled fields through escapeHtml()
 * first. Third-party victims: the tenant's staff, not the anonymous client who
 * submitted the booking.
 */

const TENANT = 'tenant-A'
const BOOKING_ID = 'bk-1'
const MEMBER_ID = 'tm-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  notify: vi.fn(async (..._args: unknown[]) => ({ success: true })),
})) as unknown as FakeStoreHandle & {
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  notify: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { POST } from './route'

const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'
const ESCAPED = '&lt;img src=x onerror=alert(document.cookie)&gt;'

function req() {
  return new Request('http://t/api/bookings/broadcast', {
    method: 'POST',
    body: JSON.stringify({ booking_id: BOOKING_ID }),
  })
}

beforeEach(() => {
  h.seq = 0
  h.notify.mockClear()
  h.requirePermission.mockResolvedValue({ tenant: { tenantId: TENANT }, error: null })
  h.store = {
    tenants: [
      {
        id: TENANT, name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null,
        resend_api_key: 'resend-key', primary_color: '#dc2626',
      },
    ],
    bookings: [
      {
        id: BOOKING_ID, tenant_id: TENANT,
        start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z',
        pay_rate: 40, service_type: PAYLOAD, notes: PAYLOAD,
        // The fake ignores select() column lists and returns the stored row
        // verbatim, so seeding a `clients` key here stands in for the real
        // `.select('*, clients(name, address)')` join result.
        clients: { name: 'Jane Doe', address: PAYLOAD },
      },
    ],
    team_members: [
      { id: MEMBER_ID, tenant_id: TENANT, status: 'active', name: 'Bob', phone: null, email: 'bob@example.com' },
    ],
    notifications: [],
  }
})

describe('POST /api/bookings/broadcast — HTML escaping of client-tainted fields', () => {
  it('escapes booking.notes, booking.service_type, and client.address before emailing the team', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(h.notify).toHaveBeenCalledTimes(1)
    const [{ message }] = h.notify.mock.calls[0] as [{ message: string }]
    expect(message).not.toContain(PAYLOAD)
    // Three independent injection points on the same request.
    expect(message.split(ESCAPED).length - 1).toBe(3)
  })
})
