/**
 * This forked assistant (nyc-mobile-salon has its own standalone _lib/selena.ts,
 * not the shared src/lib/selena-legacy.ts) had the SAME gap selena-legacy.ts's
 * handleCreateBooking had before its P11.16/17 fix: handleCheckAvailability
 * already tells the AI "Same-day booking. Rate is $100/hr emergency." but
 * handleCreateBooking trusted the LLM's hourly_rate argument verbatim and
 * never set is_emergency on the row it inserted. A model that misread or
 * forgot the $100 rate could underbill same-day bookings with zero
 * server-side guardrail.
 *
 * Fix: same-day is now determined server-side from the booking date, not
 * trusted from the LLM. A same-day booking is forced to $100/hr regardless of
 * what the LLM supplied, and is_emergency is set on every same-day booking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/app/site/nyc-mobile-salon/_lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/app/site/nyc-mobile-salon/_lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/app/site/nyc-mobile-salon/_lib/availability', () => ({
  checkAvailability: vi.fn(),
  getSmartSuggestions: vi.fn(),
  checkCleanerAvailability: vi.fn(),
}))

import { supabaseAdmin } from '@/app/site/nyc-mobile-salon/_lib/supabase'
import { handleCreateBooking, type SelenaResult, EMPTY_CHECKLIST } from './selena'

const fake = supabaseAdmin as unknown as FakeSupabase

const CLIENT = 'client-1'
const CONVO = 'convo-1'

const TODAY = new Date().toLocaleDateString('en-CA')
const NOT_TODAY = '2020-01-01'

function seed() {
  fake._store.clear()
  fake._seed('sms_conversations', [
    { id: CONVO, client_id: CLIENT, bedrooms: 1, bathrooms: 0, booking_checklist: EMPTY_CHECKLIST },
  ])
}

function freshResult(): SelenaResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

describe('nyc-mobile-salon handleCreateBooking — server-side $100 emergency rate + is_emergency', () => {
  it('same-day booking is forced to $100/hr, ignoring a lower LLM-supplied hourly_rate', async () => {
    seed()
    const input = { date: TODAY, time: '2:00 PM', service_type: 'haircut', hourly_rate: 50, estimated_hours: 1 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)
    expect(parsed.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.hourly_rate).toBe(100)
    expect(booking?.price).toBe(100 * 1 * 100)
    expect(booking?.is_emergency).toBe(true)
  })

  it('non-same-day booking keeps the LLM-supplied rate and is not flagged emergency', async () => {
    seed()
    const input = { date: NOT_TODAY, time: '2:00 PM', service_type: 'blowout', hourly_rate: 75, estimated_hours: 1 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.hourly_rate).toBe(75)
    expect(booking?.price).toBe(75 * 1 * 100)
    expect(booking?.is_emergency).toBe(false)
  })

  // "Today" must be computed in the same America/New_York zone this file's
  // buildCalendarContext already uses to give the LLM its "today"/14-day
  // calendar (the source of `date`) — comparing against the server's
  // default (UTC) zone silently missed same-day emergencies during the
  // multi-hour evening window before ET midnight, when UTC has already
  // rolled to the next calendar day. Same bug shape as item (70)'s
  // src/lib/selena/core.ts fix; this standalone per-tenant clone had it too.
  // TZ is explicitly stubbed to UTC (Vercel's actual runtime default) rather
  // than relying on the dev machine's own local zone: this sandbox's local
  // TZ is already America/New_York, which made the equivalent pre-fix
  // core.ts code pass this exact scenario too (verified directly) — a
  // false-negative for mutation testing that this stub closes.
  describe('day-boundary is computed in America/New_York, not the server default', () => {
    beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('TZ', 'UTC') })
    afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

    it('a booking for "today" (ET) is still flagged emergency even though UTC has already rolled to the next calendar date', async () => {
      // 10:30pm EDT on July 17 = 2026-07-18T02:30:00Z -- UTC day is already July 18.
      vi.setSystemTime(new Date('2026-07-18T02:30:00.000Z'))
      seed()
      const input = { date: '2026-07-17', time: '10:45 PM', service_type: 'haircut', hourly_rate: 50, estimated_hours: 1 }

      const raw = await handleCreateBooking(input, CONVO, freshResult())
      const parsed = JSON.parse(raw)

      const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
      expect(booking?.is_emergency).toBe(true)
      expect(booking?.hourly_rate).toBe(100)
    })
  })
})
