import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Coverage sweep (2026-07-28) found `mark_payment_received` had zero test
 * coverage and, unlike its money-handling siblings in this file
 * (mark_payout_paid, approve_refund, process_stripe_refund — see
 * tools.owner-tool-idempotency.test.ts / tools.refund-idempotency.test.ts),
 * handleMarkPaymentReceived had NO idempotency guard: it unconditionally
 * inserted a new `payments` row every call, with no pre-check on the
 * booking's current payment_status the way approve_refund/mark_payout_paid
 * both have. A retried/duplicate tool call (agent timeout, duplicate
 * dispatch, owner repeating themselves) would double-record the same
 * payment.
 *
 * Fixed (2026-07-28) with the exact same DB-state pre-check pattern already
 * proven on approve_refund/mark_payout_paid: if the booking is already
 * `payment_status: 'paid'`, return a no-op note instead of inserting again.
 */

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_ID) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({ success: true })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

beforeEach(() => {
  fake._store.clear()
})

describe('mark_payment_received — happy path', () => {
  it('inserts a received payment row and marks the booking paid', async () => {
    fake._seed('bookings', [{ id: 'booking_1', tenant_id: TENANT_ID, client_id: 'client_1', payment_status: 'pending' }])

    const out = await runTool(
      'mark_payment_received',
      { booking_id: 'booking_1', amount_dollars: 89, method: 'cash' },
      'convo-1', 'owner-phone', stubResult(), TENANT_ID,
    )
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(parsed.amount).toBe(89)

    const payments = fake._all('payments').filter((r) => r.booking_id === 'booking_1')
    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(8900) // dollars -> cents
    expect(payments[0].status).toBe('received')

    const booking = fake._all('bookings').find((r) => r.id === 'booking_1')!
    expect(booking.payment_status).toBe('paid')
    expect(booking.payment_received_at).toBeTruthy()
  })

  it('returns an error and writes nothing when the booking does not exist', async () => {
    const out = await runTool(
      'mark_payment_received',
      { booking_id: 'no_such_booking', amount_dollars: 50, method: 'cash' },
      'convo-1', 'owner-phone', stubResult(), TENANT_ID,
    )
    expect(JSON.parse(out).error).toBe('booking not found')
    expect(fake._all('payments')).toHaveLength(0)
  })
})

describe('mark_payment_received — duplicate call does not double-record the payment', () => {
  it('a retried/duplicate call is a no-op against an already-paid booking — exactly one payments row', async () => {
    fake._seed('bookings', [{ id: 'booking_1', tenant_id: TENANT_ID, client_id: 'client_1', payment_status: 'pending' }])

    const args = { booking_id: 'booking_1', amount_dollars: 89, method: 'cash' }
    const first = await runTool('mark_payment_received', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)

    const second = await runTool('mark_payment_received', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const secondParsed = JSON.parse(second)
    expect(secondParsed.ok).toBe(true)
    expect(secondParsed.note).toMatch(/already marked paid/)

    // The real effect at risk — a payments row — was written exactly once.
    const payments = fake._all('payments').filter((r) => r.booking_id === 'booking_1')
    expect(payments).toHaveLength(1)

    const booking = fake._all('bookings').find((r) => r.id === 'booking_1')!
    expect(booking.payment_status).toBe('paid')
  })
})
