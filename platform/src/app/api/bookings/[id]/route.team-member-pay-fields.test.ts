import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * dashboard/bookings/BookingsAdmin.tsx (the main "Bookings" tab admin UI) has
 * always tracked pay/paid-status on a booking via `cleaner_pay`/`cleaner_paid`
 * — fields that were never real bookings columns (the schema only has
 * team_pay/team_paid, migration 009, and team_member_pay/team_member_paid,
 * migration 011). This PUT route's pick() allowlist never included either
 * legacy or cleaner_* names for the amount/paid pair, so every admin edit of
 * "Team Pay"/"Team Paid" via that UI (checkout Save, Confirm Check Out, the
 * inline edit-modal inputs, and the closeout "Team Paid" toggle) was silently
 * dropped — a 200 response with nothing written, indistinguishable from
 * success. No finance/payroll report (which all sum team_member_pay) ever
 * saw pay entered this way. Fixed by adding team_member_pay/team_member_paid
 * to the allowlist and renaming the frontend fields to match.
 *
 * Flipping team_member_paid true here also needs team_member_paid_at set
 * (every other paid-flag flip in this codebase sets it, and finance/summary's
 * recent-payouts query filters/sorts on it). And flipping it back to false
 * must not be allowed once a real team_member_payouts row exists on file —
 * same double-pay door already closed on bulk payroll's claim query (commit
 * 908b2d4c): an accidental un-toggle here would re-open the booking to be
 * claimed and paid a second time by the next payroll run.
 */

const TENANT = 'tenant-a'
const BOOKING = 'booking-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmed', reschedule: () => 'rescheduled' }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from '@/app/api/bookings/[id]/route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = { params: Promise.resolve({ id: BOOKING }) }

function req(body: Record<string, unknown>): Request {
  return new Request(`https://app.fullloop.example/api/bookings/${BOOKING}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('bookings', [{
    id: BOOKING,
    tenant_id: TENANT,
    status: 'completed',
    start_time: '2026-08-01T10:00:00Z',
    client_id: 'client-1',
    team_member_pay: null,
    team_member_paid: false,
    team_member_paid_at: null,
  }])
  fake._seed('tenants', [{ id: TENANT, name: 'Biz', telnyx_api_key: null, telnyx_phone: null }])
})

describe('PUT /api/bookings/[id] — team_member_pay/team_member_paid actually persist', () => {
  it('writes team_member_pay (previously silently dropped as cleaner_pay)', async () => {
    const res = await PUT(req({ team_member_pay: 15000 }), params)
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].team_member_pay).toBe(15000)
  })

  it('marking team_member_paid true also stamps team_member_paid_at', async () => {
    const res = await PUT(req({ team_member_paid: true }), params)
    expect(res.status).toBe(200)
    const row = fake._all('bookings')[0]
    expect(row.team_member_paid).toBe(true)
    expect(row.team_member_paid_at).toBeTruthy()
  })

  it('allows marking team_member_paid false when no real payout is on file', async () => {
    fake._all('bookings')[0].team_member_paid = true
    const res = await PUT(req({ team_member_paid: false }), params)
    expect(res.status).toBe(200)
    expect(fake._all('bookings')[0].team_member_paid).toBe(false)
  })

  it('blocks marking team_member_paid false once a team_member_payouts row exists', async () => {
    fake._all('bookings')[0].team_member_paid = true
    fake._seed('team_member_payouts', [{ id: 'po-1', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 8000 }])
    const res = await PUT(req({ team_member_paid: false }), params)
    expect(res.status).toBe(409)
    expect(fake._all('bookings')[0].team_member_paid).toBe(true) // untouched
  })
})
