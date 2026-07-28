import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * handleMarkPaymentReceived (Yinez "mark_payment_received" tool) inserted a
 * payments row unconditionally on every call, with no idempotency key. An
 * agent tool call can be retried (timeout, duplicate dispatch) — without a
 * dedup check, a retried call for the SAME booking + amount + method on the
 * SAME day inserts a SECOND payments row, double-counting money the client
 * only actually paid once. Unlike process_stripe_refund, there's no external
 * API to hand an idempotency key to (this writes straight to our own DB), so
 * the check is a lookup instead: same booking+amount+method recorded today.
 * A distinct amount/method for the same booking is still a genuinely new
 * payment (e.g. partial + balance), not deduped.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const TENANT_ID = 'tenant-1'
const BOOKING_ID = 'book-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('bookings', [{ id: BOOKING_ID, tenant_id: TENANT_ID, client_id: 'client-1' }])
})

describe('mark_payment_received — duplicate tool call does not double-record the same payment', () => {
  it('two identical calls insert only ONE payments row, second is reported as a duplicate', async () => {
    const args = { booking_id: BOOKING_ID, amount_dollars: 50, method: 'zelle' }
    const first = await runTool('mark_payment_received', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const second = await runTool('mark_payment_received', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)

    expect(JSON.parse(first).ok).toBe(true)
    expect(JSON.parse(first).duplicate).toBeUndefined()
    expect(JSON.parse(second).ok).toBe(true)
    expect(JSON.parse(second).duplicate).toBe(true)

    const payments = fake._all('payments').filter((p) => p.booking_id === BOOKING_ID)
    expect(payments).toHaveLength(1)
  })

  it('a distinct amount for the same booking is a genuinely new payment, not deduped', async () => {
    await runTool('mark_payment_received', { booking_id: BOOKING_ID, amount_dollars: 50, method: 'zelle' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    await runTool('mark_payment_received', { booking_id: BOOKING_ID, amount_dollars: 25, method: 'zelle' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)

    const payments = fake._all('payments').filter((p) => p.booking_id === BOOKING_ID)
    expect(payments).toHaveLength(2)
  })

  it('a distinct method for the same booking+amount is a genuinely new payment, not deduped', async () => {
    await runTool('mark_payment_received', { booking_id: BOOKING_ID, amount_dollars: 50, method: 'zelle' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    await runTool('mark_payment_received', { booking_id: BOOKING_ID, amount_dollars: 50, method: 'cash' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)

    const payments = fake._all('payments').filter((p) => p.booking_id === BOOKING_ID)
    expect(payments).toHaveLength(2)
  })
})
