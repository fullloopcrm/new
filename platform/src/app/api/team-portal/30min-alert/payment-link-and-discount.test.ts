import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * PARITY-DIFF (W4, PAYMENT lane): cutover checklist items "Client `collect` /
 * payment-link page works with link-based Stripe" and "Waitlist / self-book $10
 * path" were both marked not-yet-exercised. The route (ported from nycmaid's
 * team/30min-alert) already carries the right behavior — a fresh per-booking
 * adjustable-amount Stripe Payment Link created via `createPaymentLink()`
 * (gated on the tenant's own `stripe_api_key`, never a hardcoded/shared
 * link), and the $10 self-booking discount applied when `booking.notes`
 * carries the flag `/api/client/book` writes at booking time — but neither
 * was locked in by a test. This proves both, and that a non-self-booked job
 * is NOT discounted.
 *
 * NOTE: this file previously mocked `@/lib/nycmaid/client-contacts` (the
 * route imports `@/lib/client-contacts` instead), so the mock never
 * intercepted and every assertion here silently fell through to the real,
 * unmocked send path — which threw ("tenantDb requires a tenantId", since
 * this file's fake `tenants` row never had an `id`) and then hung on the
 * route's real 60s retry backoff. Fixed to mock the module the route
 * actually imports. Along the way, two assertions here had also gone stale
 * against the current route: the client SMS text reads "Total: $X.XX", not
 * "Your total: $X.XX", and pay-link creation no longer substitutes
 * `tenant.payment_link` + `?client_reference_id=` (that field isn't even
 * selected from `tenants` anymore) — it creates a real per-booking Stripe
 * Payment Link. Both are corrected below to match current behavior.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'

type Booking = Record<string, unknown>
const state: { booking: Booking | null; stripeApiKey: string | null } = { booking: null, stripeApiKey: null }
let lastClientSms = ''

const { createPaymentLink } = vi.hoisted(() => ({
  createPaymentLink: vi.fn(async (_opts: Record<string, unknown>) => ({ url: 'https://buy.stripe.com/test_mocklink' })),
}))

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
      is: () => c,
      lt: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'team_members' && selectStr.includes('status')) return { data: { status: 'active' }, error: null }
        if (table === 'tenants' && selectStr.includes('selena_config')) return { data: { selena_config: null }, error: null }
        if (table === 'tenants') return { data: { id: TENANT, name: 'T', telnyx_api_key: 'k', telnyx_phone: '+15550001', stripe_api_key: state.stripeApiKey }, error: null }
        if (table === 'bookings') return { data: state.booking, error: null }
        return { data: null, error: null }
      },
      // The atomic idempotency-claim update chains .or(...).select(...).maybeSingle() --
      // returning the booking (truthy) here means the claim always succeeds in
      // these tests, same as the pre-existing single() behavior for 'bookings'.
      maybeSingle: async () => {
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
// route.ts imports sendClientSMS from the tenant-aware @/lib/client-contacts,
// whose signature is (tenant, clientId, message) — not the legacy
// @/lib/nycmaid/client-contacts' (clientId, message, options).
vi.mock('@/lib/client-contacts', () => ({
  sendClientSMS: async (_tenant: unknown, _clientId: string, body: string) => { lastClientSms = body; return { sent: 1, skipped: 0 } },
}))
vi.mock('@/lib/stripe', () => ({ createPaymentLink }))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function req(): NextRequest {
  return new NextRequest('https://x/api/team-portal/30min-alert', {
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
  state.stripeApiKey = 'sk_test_123'
  createPaymentLink.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('15min-alert — payment link + $10 self-booking discount parity', () => {
  it('creates a fresh per-booking adjustable-amount Stripe payment link (not a hardcoded/shared link) and includes it in the client SMS', async () => {
    state.booking = baseBooking({ notes: null })
    const res = await POST(req())
    expect(res.status).toBe(200)

    expect(createPaymentLink).toHaveBeenCalledTimes(1)
    const call = createPaymentLink.mock.calls[0][0] as Record<string, unknown>
    expect(call.bookingId).toBe('bk')
    expect(call.tenantId).toBe(TENANT)
    expect(call.stripeApiKey).toBe('sk_test_123')
    expect(call.adjustableAmount).toBe(true)

    expect(lastClientSms).toContain('Pay here: https://buy.stripe.com/test_mocklink')
  })

  it('applies the $10 self-booking discount when the booking notes carry the flag set by /api/client/book', async () => {
    state.booking = baseBooking({
      notes: 'Some note\n\n[Promo: $10 self-booking discount applies at billing]',
    })
    await POST(req())
    // 2hr checked-in-to-checked-out window, already checked out -> no +30 buffer.
    // clientBilledHours(120min) = 2.0h * $69/hr = $138.00 gross, less $10 = $128.
    expect(lastClientSms).toContain('Total: $128.00')
  })

  it('does NOT discount a booking that was not self-booked', async () => {
    state.booking = baseBooking({ notes: 'Booked by admin over the phone' })
    await POST(req())
    expect(lastClientSms).toContain('Total: $138.00')
  })

  it('omits the payment link entirely when the tenant has no Stripe key configured, instead of falling back to a shared/hardcoded link', async () => {
    state.stripeApiKey = null
    state.booking = baseBooking({ notes: null })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(createPaymentLink).not.toHaveBeenCalled()
    expect(lastClientSms).not.toContain('Pay here:')
  })
})
