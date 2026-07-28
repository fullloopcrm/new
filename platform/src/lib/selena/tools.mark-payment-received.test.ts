import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Coverage sweep (2026-07-28) found `mark_payment_received` had zero test
 * coverage and, unlike its money-handling siblings in this file
 * (mark_payout_paid, approve_refund, process_stripe_refund — see
 * tools.owner-tool-idempotency.test.ts / tools.refund-idempotency.test.ts),
 * handleMarkPaymentReceived has NO idempotency guard: it unconditionally
 * inserts a new `payments` row every call, with no pre-check on the
 * booking's current payment_status the way approve_refund/mark_payout_paid
 * both have.
 *
 * These are CHARACTERIZATION tests — they document current behavior
 * (including the double-insert on retry) rather than asserting what the
 * "correct" behavior should be. Flagged to the team; not fixed here since
 * changing production money-recording behavior is outside a test-coverage
 * pass's scope.
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

describe('mark_payment_received — CHARACTERIZATION: no idempotency guard (unlike its siblings)', () => {
  it('a retried/duplicate call inserts a SECOND payment row for the same booking+amount — this is current behavior, not a spec', async () => {
    fake._seed('bookings', [{ id: 'booking_1', tenant_id: TENANT_ID, client_id: 'client_1', payment_status: 'pending' }])

    const args = { booking_id: 'booking_1', amount_dollars: 89, method: 'cash' }
    const first = await runTool('mark_payment_received', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)

    const second = await runTool('mark_payment_received', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(second).ok).toBe(true)

    // Unlike approve_refund/mark_payout_paid (which pre-check DB state and
    // no-op on a retry), this handler has no such guard: two identical
    // tool calls double-record the payment.
    const payments = fake._all('payments').filter((r) => r.booking_id === 'booking_1')
    expect(payments).toHaveLength(2)
  })
})
