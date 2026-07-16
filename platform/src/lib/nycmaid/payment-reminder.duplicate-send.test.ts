/**
 * runNycMaidPaymentReminder's Stage 1 (client nudge) SELECTed bookings with
 * `payment_reminder_sent_at IS NULL`, sent the SMS, THEN stamped the
 * timestamp. Two overlapping invocations of the payment-reminder cron (a
 * slow run bumping into the next 5-min tick, or a manual re-trigger) could
 * both read the same booking as eligible and both text the client before
 * either wrote the claim. Fixed with the same conditional-UPDATE claim
 * pattern as the rating-prompt cron: only the run whose UPDATE actually
 * matches a row (payment_reminder_sent_at IS NULL) sends.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_ID } = vi.hoisted(() => ({ TENANT_ID: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})

const smsSends: string[] = []
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: vi.fn(async (clientId: string) => {
    smsSends.push(clientId)
    return { sent: 1, skipped: 0 }
  }),
}))

vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  smsAdmins: vi.fn(async () => {}),
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async () => {}),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { runNycMaidPaymentReminder } from './payment-reminder'

const fake = supabaseAdmin as unknown as FakeSupabase

function seedEligibleBooking() {
  const alertTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      fifteen_min_alert_time: alertTime,
      payment_status: 'pending',
      payment_method: null,
      payment_reminder_sent_at: null,
      clients: { name: 'Jane Doe', phone: '+15559998888' },
    },
  ])
}

describe('runNycMaidPaymentReminder — Stage 1 duplicate-send guard', () => {
  beforeEach(() => {
    smsSends.length = 0
  })

  it('nudges once for a normal single run', async () => {
    seedEligibleBooking()
    const result = await runNycMaidPaymentReminder(TENANT_ID)
    expect(result.nudges).toBe(1)
    expect(smsSends).toEqual(['client-1'])
    expect(fake._all('bookings')[0].payment_reminder_sent_at).not.toBeNull()
  })

  it('does not double-nudge when two overlapping cron invocations race the same booking', async () => {
    seedEligibleBooking()

    const [resultA, resultB] = await Promise.all([
      runNycMaidPaymentReminder(TENANT_ID),
      runNycMaidPaymentReminder(TENANT_ID),
    ])

    expect(resultA.nudges + resultB.nudges).toBe(1)
    expect(smsSends).toEqual(['client-1'])
    expect(fake._all('bookings')[0].payment_reminder_sent_at).not.toBeNull()
  })

  it('does not re-nudge on a subsequent run once already sent', async () => {
    seedEligibleBooking()
    await runNycMaidPaymentReminder(TENANT_ID)
    smsSends.length = 0

    const result = await runNycMaidPaymentReminder(TENANT_ID)
    expect(result.nudges).toBe(0)
    expect(smsSends).toEqual([])
  })
})
