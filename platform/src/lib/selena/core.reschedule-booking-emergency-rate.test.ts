/**
 * Yinez SMS agent (src/lib/selena/core.ts) handleRescheduleBooking — fresh-
 * ground twin of core.create-booking-emergency-rate.test.ts. A client moving
 * an existing booking into today via the AI bot never set is_emergency or
 * the $89/hr same-day rate, unlike handleCreateBooking (already fixed,
 * P11.16/17-class) and PUT /api/client/reschedule/[id]'s becomesEmergency
 * (item 11, same session). Fixed to match both.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (c: string) => c }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { handleRescheduleBooking } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const CONVO = 'convo-1'
const BOOKING = 'booking-1'

const TODAY = new Date().toLocaleDateString('en-CA')

function farFutureIso(daysOut: number): string {
  return new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000).toISOString()
}

function seed() {
  fake._store.clear()
  fake._seed('sms_conversations', [{ id: CONVO, tenant_id: TENANT, client_id: CLIENT }])
  fake._seed('bookings', [{
    id: BOOKING, tenant_id: TENANT, client_id: CLIENT,
    start_time: farFutureIso(30), recurring_type: 'weekly',
    hourly_rate: 69, price: 69 * 2 * 100, is_emergency: false,
  }])
}

describe('Yinez handleRescheduleBooking — same-day landing forces $89/hr + is_emergency', () => {
  it('rescheduling a far-future recurring booking to today sets emergency rate + flag', async () => {
    seed()
    const out = JSON.parse(await handleRescheduleBooking({ booking_id: BOOKING, new_date: TODAY, new_time: '2:00 PM' }, CONVO))
    expect(out.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING)
    expect(booking?.is_emergency).toBe(true)
    expect(booking?.hourly_rate).toBe(89)
    expect(booking?.price).toBe(89 * 2 * 100)
  })

  it('rescheduling to a far-future date keeps the routine rate and is_emergency false', async () => {
    seed()
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
    const out = JSON.parse(await handleRescheduleBooking({ booking_id: BOOKING, new_date: futureDate, new_time: '2:00 PM' }, CONVO))
    expect(out.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING)
    expect(booking?.is_emergency).toBe(false)
    expect(booking?.hourly_rate).toBe(69) // unchanged — not overwritten
  })

  // Same America/New_York-vs-server-default fix as handleCreateBooking's
  // own todayStr check — see core.create-booking-emergency-rate.test.ts.
  describe('day-boundary is computed in America/New_York, not the server default', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('a reschedule to "today" (ET) is still flagged emergency even though UTC has already rolled to the next calendar date', async () => {
      // 10:30pm EDT on July 17 = 2026-07-18T02:30:00Z -- UTC day is already July 18.
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      seed()
      const out = JSON.parse(await handleRescheduleBooking({ booking_id: BOOKING, new_date: '2026-07-17', new_time: '10:45 PM' }, CONVO))
      expect(out.success).toBe(true)

      const booking = fake._store.get('bookings')?.find((b) => b.id === BOOKING)
      expect(booking?.is_emergency).toBe(true)
      expect(booking?.hourly_rate).toBe(89)
    })
  })
})
