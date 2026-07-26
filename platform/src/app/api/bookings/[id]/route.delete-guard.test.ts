import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * Cancel and Delete were the same action (hard DELETE) until 2026-07-24.
 * payments/reviews/team_member_payouts all reference bookings.id with a
 * blocking (NO ACTION) foreign key — reproduced live against a real nycmaid
 * booking with a payment row: "update or delete on table bookings violates
 * foreign key constraint payments_booking_id_fkey". Every booking with any
 * payment/review/payout history failed to "cancel" with that raw Postgres
 * error, and there was no way to actually cancel one (Cancel === Delete).
 * DELETE now checks for that history first and returns a clear 409 instead,
 * steering the caller to the new status-based Cancel endpoint.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Row[]> })) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ cancellation: () => '' }) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { DELETE } from '@/app/api/bookings/[id]/route'

function req(): Request {
  return new Request(`http://t.test/api/bookings/${BOOKING_ID}`, { method: 'DELETE' })
}

function seedBooking() {
  h.store = {
    bookings: [{ id: BOOKING_ID, tenant_id: TENANT, client_id: CLIENT, status: 'cancelled', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Own Client', phone: '+15551234567', email: 'client@example.com' } }],
    tenants: [{ id: TENANT, name: 'Own Biz', telnyx_api_key: 'key', telnyx_phone: '+15550001111' }],
    payments: [],
    reviews: [],
    team_member_payouts: [],
  }
}

describe('DELETE /api/bookings/[id] — payment/review/payout guard', () => {
  beforeEach(() => {
    h.seq = 0
    seedBooking()
  })

  it('deletes cleanly when there is no payment/review/payout history', async () => {
    const res = await DELETE(req(), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === BOOKING_ID)).toBeUndefined()
  })

  it('blocks with 409 when a payment row references the booking', async () => {
    h.store.payments = [{ id: 'pay-1', tenant_id: TENANT, booking_id: BOOKING_ID }]
    const res = await DELETE(req(), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('has_dependent_records')
    expect(h.store.bookings.find((b) => b.id === BOOKING_ID)).toBeDefined()
  })

  it('blocks with 409 when a review row references the booking', async () => {
    h.store.reviews = [{ id: 'rev-1', tenant_id: TENANT, booking_id: BOOKING_ID }]
    const res = await DELETE(req(), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(409)
    expect(h.store.bookings.find((b) => b.id === BOOKING_ID)).toBeDefined()
  })

  it('blocks with 409 when a team_member_payouts row references the booking', async () => {
    h.store.team_member_payouts = [{ id: 'payout-1', tenant_id: TENANT, booking_id: BOOKING_ID }]
    const res = await DELETE(req(), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(409)
    expect(h.store.bookings.find((b) => b.id === BOOKING_ID)).toBeDefined()
  })
})
