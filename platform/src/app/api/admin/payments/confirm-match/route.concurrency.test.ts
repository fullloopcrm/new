import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * 💰 TOCTOU / double-post — POST /api/admin/payments/confirm-match.
 *
 * The handler read `unmatched_payments.status` once and 409'd if it was
 * already 'matched', but the write that actually flipped status to 'matched'
 * was an unconditional UPDATE several awaits later. Two concurrent
 * confirm-match requests for the SAME unmatched payment (e.g. two admins
 * both clicking "match" on the same Zelle payment against different
 * bookings) both pass the stale read-time check and both insert a
 * `payments` row and flip a booking to paid — double-recording the same
 * real-world payment.
 *
 * Fix: an atomic conditional UPDATE (`status != 'matched'`) run immediately
 * before the payments insert / booking update. The loser's claim matches
 * zero rows and is turned away with 409 before touching `payments` or
 * `bookings`.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))

import { POST } from './route'

function seed() {
  return {
    unmatched_payments: [
      {
        id: 'up-1',
        tenant_id: TENANT,
        method: 'zelle',
        amount_cents: 15000,
        sender_name: 'Jane Client',
        status: 'unmatched',
        raw_email_id: null,
      },
    ],
    bookings: [
      { id: 'bk-1', tenant_id: TENANT, client_id: 'client-1', team_member_id: null, hourly_rate: null, actual_hours: null, price: 15000 },
    ],
    tenants: [{ id: TENANT, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
    payments: [] as Record<string, any>[],
    notifications: [] as Record<string, any>[],
  }
}

function post(body: unknown) {
  return POST(new Request('http://t/api/admin/payments/confirm-match', { method: 'POST', body: JSON.stringify(body) }))
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/payments/confirm-match POST — double-post race', () => {
  it('two concurrent confirm-match requests for the same unmatched payment insert exactly one payment', async () => {
    const [r1, r2] = await Promise.all([
      post({ unmatchedPaymentId: 'up-1', bookingId: 'bk-1' }),
      post({ unmatchedPaymentId: 'up-1', bookingId: 'bk-1' }),
    ])
    const bodies = await Promise.all([r1.json(), r2.json()])
    const statuses = [r1.status, r2.status].sort()

    // Exactly one winner (200) and one loser (409 "Already matched").
    expect(statuses).toEqual([200, 409])
    const loser = bodies.find((b) => 'error' in b)
    expect(loser?.error).toMatch(/already matched/i)

    // The money-critical assertion: only ONE payments row exists.
    expect(h.seed.payments.length).toBe(1)
    expect(h.seed.payments[0].amount_cents).toBe(15000)

    const up = h.seed.unmatched_payments.find((r) => r.id === 'up-1')!
    expect(up.status).toBe('matched')
  })

  it('solo request still matches normally (fix does not break the happy path)', async () => {
    const res = await post({ unmatchedPaymentId: 'up-1', bookingId: 'bk-1' })
    expect(res.status).toBe(200)
    expect(h.seed.payments.length).toBe(1)
    expect(h.seed.bookings[0].payment_status).toBe('paid')
  })

  it('a second request after the first already matched is rejected, not double-posted', async () => {
    const first = await post({ unmatchedPaymentId: 'up-1', bookingId: 'bk-1' })
    expect(first.status).toBe(200)

    const second = await post({ unmatchedPaymentId: 'up-1', bookingId: 'bk-1' })
    expect(second.status).toBe(409)
    expect((await second.json()).error).toMatch(/already matched/i)
    expect(h.seed.payments.length).toBe(1)
  })

  it("wrong-tenant probe: a foreign tenant's unmatched payment is never reachable", async () => {
    h.seed.unmatched_payments.push({
      id: 'up-b',
      tenant_id: OTHER_TENANT,
      method: 'venmo',
      amount_cents: 9000,
      sender_name: 'B Client',
      status: 'unmatched',
      raw_email_id: null,
    })
    const res = await post({ unmatchedPaymentId: 'up-b', bookingId: 'bk-1' })
    expect(res.status).toBe(404)
    expect(h.seed.payments.length).toBe(0)
    const foreign = h.seed.unmatched_payments.find((r) => r.id === 'up-b')!
    expect(foreign.status).toBe('unmatched')
  })
})
