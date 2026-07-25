import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Regression test for the Paul Oberbeck / nycmaid booking 8e1e4cf2 incident
 * (2026-07-24): client self-service bookings insert directly at status
 * 'scheduled' (create_booking_atomic). Assigning a cleaner afterward via a
 * team_member_id-only PATCH never flipped `status`, so the client-confirmed
 * send block (gated on statusChanged) silently never fired — the client got
 * zero confirmation while the cleaner got their assignment SMS.
 *
 * Send path updated 2026-07-24 (comms-audit): booking confirmation now goes
 * through buildBookingConfirmationEmail() + the global multi-contact
 * sendClientEmail() (lib/client-contacts.ts) instead of notify() — same
 * regression, new assertions.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Row[]>,
})) as unknown as FakeStoreHandle

const sendClientEmailMock = vi.hoisted(() =>
  vi.fn(async (_tenant: Record<string, unknown>, _clientId: string, _subject: string, _html: string) => ({ sent: 1, skipped: 0 })),
)
const buildBookingConfirmationEmailMock = vi.hoisted(() =>
  vi.fn(async (_tenantId: string, _bookingId: string, _fields: Record<string, unknown>) => '<html>confirmed</html>'),
)

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async () => ({ success: true })),
  buildBookingConfirmationEmail: buildBookingConfirmationEmailMock,
}))
vi.mock('@/lib/client-contacts', () => ({
  sendClientEmail: sendClientEmailMock,
}))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => '' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { PUT as UPDATE } from '@/app/api/bookings/[id]/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/bookings/${BOOKING_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/bookings/[id] — client confirmation on cleaner assignment', () => {
  beforeEach(() => {
    h.seq = 0
    sendClientEmailMock.mockClear()
    buildBookingConfirmationEmailMock.mockClear()
    h.store = {
      bookings: [{ id: BOOKING_ID, tenant_id: TENANT, client_id: CLIENT, team_member_id: null, status: 'scheduled', start_time: '2026-08-01T10:00:00Z' }],
      tenants: [{ id: TENANT, name: 'Own Biz', slug: 'own-biz', resend_api_key: null, email_from: null }],
      clients: [{ id: CLIENT, tenant_id: TENANT, name: 'Own Client', phone: null, email: 'client@example.com' }],
      team_members: [{ id: MEMBER, tenant_id: TENANT, name: 'Own Member', phone: null }],
    }
  })

  it('notifies the client when a cleaner is assigned to a booking already at status scheduled', async () => {
    const res = await UPDATE(jsonReq({ team_member_id: MEMBER }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(buildBookingConfirmationEmailMock).toHaveBeenCalledWith(TENANT, BOOKING_ID, expect.any(Object))
    expect(sendClientEmailMock).toHaveBeenCalledTimes(1)
    const [tenantArg, clientIdArg] = sendClientEmailMock.mock.calls[0]
    expect(tenantArg).toMatchObject({ id: TENANT })
    expect(clientIdArg).toBe(CLIENT)
  })

  it('does not double-notify when status is also explicitly changing to scheduled in the same call', async () => {
    h.store.bookings[0].status = 'pending'
    const res = await UPDATE(jsonReq({ team_member_id: MEMBER, status: 'scheduled' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(sendClientEmailMock).toHaveBeenCalledTimes(1)
  })
})
