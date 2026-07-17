/**
 * Yinez SMS agent (src/lib/selena/core.ts) — the platform's most-used AI
 * booking assistant, extensively prompted with "Same-day cleaning at $89/hr"
 * across its checklist/system-prompt/FAQ copy — had ZERO server-side
 * enforcement of that rate in handleCreateBooking: hourly_rate came straight
 * from the LLM's tool-call argument, and is_emergency was never set on the
 * row it inserted. Same bug class as selena-legacy.ts's pre-P11.16/17
 * handleCreateBooking, found while verifying that fix end-to-end across
 * every real AI/SMS booking entry point on the platform.
 *
 * Fix: same-day is now determined server-side from the booking date, not
 * trusted from the LLM. A same-day booking is forced to $89/hr regardless of
 * what the LLM supplied, and is_emergency is set on every same-day booking.
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
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { handleCreateBooking, EMPTY_CHECKLIST, type YinezResult } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const CONVO = 'convo-1'

const TODAY = new Date().toLocaleDateString('en-CA')
const NOT_TODAY = '2020-01-01'

function seed() {
  fake._store.clear()
  fake._seed('sms_conversations', [
    { id: CONVO, tenant_id: TENANT, client_id: CLIENT, phone: '5551234567', bedrooms: 2, bathrooms: 1, booking_checklist: EMPTY_CHECKLIST },
  ])
  fake._seed('clients', [{ id: CLIENT, tenant_id: TENANT, name: 'Test Client' }])
}

function freshResult(): YinezResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

describe('Yinez handleCreateBooking — server-side $89 emergency rate + is_emergency', () => {
  it('same-day booking is forced to $89/hr, ignoring a lower LLM-supplied hourly_rate', async () => {
    seed()
    const input = { date: TODAY, time: '2:00 PM', service_type: 'deep', hourly_rate: 59, estimated_hours: 3 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)
    expect(parsed.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.hourly_rate).toBe(89)
    expect(booking?.price).toBe(89 * 3 * 100)
    expect(booking?.is_emergency).toBe(true)
  })

  it('non-same-day booking keeps the LLM-supplied rate and is not flagged emergency', async () => {
    seed()
    const input = { date: NOT_TODAY, time: '2:00 PM', service_type: 'regular', hourly_rate: 69, estimated_hours: 2 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.hourly_rate).toBe(69)
    expect(booking?.price).toBe(69 * 2 * 100)
    expect(booking?.is_emergency).toBe(false)
  })

  // "Today" must be computed in the same America/New_York zone this file's
  // buildCalendarContext already uses to give the LLM its "today"/14-day
  // calendar (the source of `date`) — comparing against the server's
  // default (UTC) zone silently missed same-day emergencies during the
  // multi-hour evening window before ET midnight, when UTC has already
  // rolled to the next calendar day.
  describe('day-boundary is computed in America/New_York, not the server default', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('a booking for "today" (ET) is still flagged emergency even though UTC has already rolled to the next calendar date', async () => {
      // 10:30pm EDT on July 17 = 2026-07-18T02:30:00Z -- UTC day is already July 18.
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      seed()
      const input = { date: '2026-07-17', time: '10:45 PM', service_type: 'deep', hourly_rate: 59, estimated_hours: 2 }

      const raw = await handleCreateBooking(input, CONVO, freshResult())
      const parsed = JSON.parse(raw)

      const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
      expect(booking?.is_emergency).toBe(true)
      expect(booking?.hourly_rate).toBe(89)
    })
  })
})
