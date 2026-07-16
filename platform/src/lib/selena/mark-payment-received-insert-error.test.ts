import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * mark_payment_received (Selena/Jefe owner tool) — swallowed payments-insert
 * error.
 *
 * handleMarkPaymentReceived() inserted into `payments` without checking the
 * insert's error, then unconditionally marked the booking `payment_status:
 * 'paid'`. If the insert failed for any reason (bad FK, constraint
 * violation, transient DB error), the tool still reported success and the
 * booking was flipped to paid with NO payments row behind it -- same bug
 * class as the Stripe invoice-payment silent-failure fix.
 *
 * Fix: check the insert error and return it (leaving the booking untouched)
 * instead of proceeding to mark the booking paid.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  // Not a real prod constraint -- just the fake's mechanism for forcing the
  // insert to return an error, to exercise this test's error-handling path.
  fake._addUniqueConstraint('payments', 'booking_id')
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-A'
const OWNER_PHONE = '3105559999'
const BOOKING_ID = 'booking-1'

function freshResult(): YinezResult {
  return { text: '', toolsCalled: [] }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, owner_phone: OWNER_PHONE }])
  fake._seed('bookings', [
    { id: BOOKING_ID, tenant_id: TENANT_ID, client_id: 'client-1', payment_status: 'pending' },
  ])
})

describe('mark_payment_received — payments insert error handling', () => {
  it('does NOT mark the booking paid when the payments insert fails', async () => {
    // A payments row already exists for this booking_id -- the unique
    // constraint above forces the tool's insert to collide and return an
    // error, exactly like a real constraint violation would.
    fake._seed('payments', [{ id: 'existing-payment', tenant_id: TENANT_ID, booking_id: BOOKING_ID }])

    const out = await runTool(
      'mark_payment_received',
      { booking_id: BOOKING_ID, amount_dollars: 50, method: 'zelle' },
      'conv-1',
      OWNER_PHONE,
      freshResult(),
      TENANT_ID,
      true,
    )
    const parsed = JSON.parse(out)

    expect(parsed.error).toMatch(/payment insert failed/i)
    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING_ID)
    expect(booking?.payment_status).toBe('pending')
  })

  it('CONTROL: marks the booking paid on a successful insert (no regression)', async () => {
    const out = await runTool(
      'mark_payment_received',
      { booking_id: BOOKING_ID, amount_dollars: 50, method: 'zelle' },
      'conv-1',
      OWNER_PHONE,
      freshResult(),
      TENANT_ID,
      true,
    )
    const parsed = JSON.parse(out)

    expect(parsed.ok).toBe(true)
    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING_ID)
    expect(booking?.payment_status).toBe('paid')
  })
})
