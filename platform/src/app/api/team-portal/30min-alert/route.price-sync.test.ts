import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Regression test for the phantom-tip bug: a client paying via the 30-min-
 * alert pay link (always BEFORE checkout) was compared, at Stripe-webhook
 * time, against booking.price -- which this route computes a live,
 * checked-in-elapsed estimate for and texts to the client, but previously
 * never persisted. Any drift between that live estimate and whatever price
 * happened to be on the row already (e.g. a stale creation-time estimate)
 * got misread downstream as a client tip, inflating what a cleaner is shown
 * (and can be marked paid) as owed -- see the webhook route.ts comment this
 * fix closes. Proves this route now writes booking.price to match EXACTLY
 * the dollar amount it quotes the client in the SMS, so a same-amount
 * payment can never misread as an overpayment/tip.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: TENANT_A },
    error: null,
  })),
}))

const sendClientSMS = vi.hoisted(() => vi.fn(async () => ({ sent: 1, skipped: 0 })))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS }))

import { NextRequest } from 'next/server'
import { POST } from './route'

let h: Harness
const NOW = new Date('2026-07-29T16:00:00.000Z')
const CHECK_IN = new Date(NOW.getTime() - 120 * 60 * 1000).toISOString() // checked in 2h ago, still in progress

function seed() {
  return {
    tenants: [
      { id: TENANT_A, name: 'Test Tenant', telnyx_api_key: 'x', telnyx_phone: '+15550001111', payment_link: 'https://buy.stripe.com/test_abc' },
    ],
    bookings: [
      {
        id: 'bk1',
        tenant_id: TENANT_A,
        start_time: CHECK_IN,
        end_time: null,
        check_in_time: CHECK_IN,
        check_out_time: null,
        service_type: 'regular',
        hourly_rate: 69,
        pay_rate: null,
        // Deliberately stale/wrong -- far from the live in-progress estimate
        // this route is about to quote, standing in for whatever the booking
        // was created with. Proves the write below actually overwrites it
        // rather than coincidentally already matching.
        price: 5000,
        notes: null,
        max_hours: null,
        team_size: 1,
        team_member_id: 'tm1',
        client_id: 'cl1',
        payment_status: 'pending',
        fifteen_min_alert_time: null,
        discount_percent: null,
        one_time_credit_cents: null,
        clients: { name: 'Kim Abramson', phone: '+15559998888', email: 'kim@example.com', address: '123 Main St' },
        team_members: { name: 'Sobeida Suero Perez', pay_rate: 31 },
      },
    ],
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  h = createTenantDbHarness(seed())
  holder.from = h.from
  sendClientSMS.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/team-portal/30min-alert — price/quote sync', () => {
  it('persists booking.price to exactly the dollar amount quoted in the client SMS', async () => {
    const req = new NextRequest('https://x/api/team-portal/30min-alert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookingId: 'bk1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(sendClientSMS).toHaveBeenCalledTimes(1)
    const smsText = sendClientSMS.mock.calls[0][1] as string
    const match = smsText.match(/Your total: \$([0-9]+\.[0-9]{2})/)
    expect(match).not.toBeNull()
    const quotedCents = Math.round(parseFloat(match![1]) * 100)

    const booking = h.seed.bookings[0]
    expect(booking.price).toBe(quotedCents)
    expect(booking.price).not.toBe(5000)
  })
})
