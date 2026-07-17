import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * PARITY-DIFF (W4, PAYMENT lane): cutover checklist items "Client `collect` /
 * payment-link page works with link-based Stripe" and "Waitlist / self-book $10
 * path" were both marked not-yet-exercised. The route (ported from nycmaid's
 * team/30min-alert) already carries the right behavior — the tenant's own
 * `payment_link` substituted in with `client_reference_id`, and the $10
 * self-booking discount applied when `booking.notes` carries the flag
 * `/api/client/book` writes at booking time — but neither was locked in by a
 * test. This proves both, and that a non-self-booked job is NOT discounted.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'

type Booking = Record<string, unknown>
const state: { booking: Booking | null; paymentLink: string | null } = { booking: null, paymentLink: null }
let lastClientSms = ''

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let selectStr = ''
    const c: Record<string, unknown> = {
      select: (s = '') => { selectStr = s; return c },
      update: () => c,
      insert: () => c,
      eq: () => c,
      in: () => c,
      not: () => c,
      or: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      // The 15min-alert atomic claim (`.update(...).eq(...).or(...).select('id').maybeSingle()`)
      // always "wins" in this mock — it isn't exercising the race guard, just
      // needs to not throw so the payment-link/discount assertions still see
      // the SMS send that follows the claim.
      maybeSingle: async () => ({ data: table === 'bookings' ? { id: (state.booking as Booking | null)?.id ?? 'bk' } : null, error: null }),
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'tenants' && selectStr.includes('selena_config')) return { data: { selena_config: null }, error: null }
        if (table === 'tenants') return { data: { name: 'T', telnyx_api_key: 'k', telnyx_phone: '+15550001', payment_link: state.paymentLink }, error: null }
        if (table === 'bookings') return { data: state.booking, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})

vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: async (_clientId: string, body: string) => { lastClientSms = body; return { sent: 1, skipped: 0 } },
}))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function req(): NextRequest {
  return new NextRequest('https://x/api/team-portal/15min-alert', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${createToken(MEMBER_A, TENANT, 0, 'worker')}` },
    body: JSON.stringify({ bookingId: 'bk' }),
  })
}

function baseBooking(over: Booking = {}): Booking {
  return {
    id: 'bk', tenant_id: TENANT, team_member_id: MEMBER_A, client_id: 'c-1',
    start_time: '2026-08-01T10:00:00', check_in_time: '2026-08-01T10:00:00', check_out_time: '2026-08-01T12:00:00',
    service_type: 'regular', hourly_rate: 69, pay_rate: 25, price: 0,
    notes: null, max_hours: null, team_size: 1, payment_status: 'unpaid', fifteen_min_alert_time: null,
    clients: { name: 'Client One', phone: '+12125551234', email: null, address: null },
    team_members: { name: 'Worker', pay_rate: 25 },
    ...over,
  }
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  lastClientSms = ''
  state.paymentLink = 'https://buy.stripe.com/test_abc123'
})

afterEach(() => {
  vi.useRealTimers()
})

describe('15min-alert — payment link + $10 self-booking discount parity', () => {
  it('substitutes the TENANT\'s own payment_link (not a hardcoded nycmaid link) with client_reference_id', async () => {
    state.booking = baseBooking({ notes: null })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(lastClientSms).toContain('Pay here: https://buy.stripe.com/test_abc123?client_reference_id=bk')
  })

  it('applies the $10 self-booking discount when the booking notes carry the flag set by /api/client/book', async () => {
    state.booking = baseBooking({
      notes: 'Some note\n\n[Promo: $10 self-booking discount applies at billing]',
    })
    await POST(req())
    // 2hr checked-in-to-checked-out window, already checked out -> no +30 buffer.
    // clientBilledHours(120min) = 2.0h * $69/hr = $138.00 gross, less $10 = $128.
    expect(lastClientSms).toContain('Your total: $128.00')
  })

  it('does NOT discount a booking that was not self-booked', async () => {
    state.booking = baseBooking({ notes: 'Booked by admin over the phone' })
    await POST(req())
    expect(lastClientSms).toContain('Your total: $138.00')
  })

  it('appends client_reference_id correctly even when the tenant payment_link already has a query string', async () => {
    state.paymentLink = 'https://buy.stripe.com/test_abc123?locale=en'
    state.booking = baseBooking({ notes: null })
    await POST(req())
    expect(lastClientSms).toContain('https://buy.stripe.com/test_abc123?locale=en&client_reference_id=bk')
  })
})
