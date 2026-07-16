/**
 * This forked assistant (wash-and-fold-nyc has its own standalone _lib/selena.ts,
 * not the shared src/lib/selena-legacy.ts) had the SAME gap selena-legacy.ts's
 * handleCreateBooking had before its P11.16/17 fix: handleCheckAvailability
 * already tells the AI "Same-day booking. Rate is $100/hr emergency." but
 * handleCreateBooking trusted the LLM's hourly_rate argument verbatim and never
 * set is_emergency on the row it inserted. A model that misread or forgot the
 * $100 rate could underbill same-day bookings with zero server-side guardrail.
 *
 * Fix: same-day is now determined server-side from the booking date, not
 * trusted from the LLM. A same-day booking is forced to $100/hr regardless of
 * what the LLM supplied, and is_emergency is set on every same-day booking.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/app/site/wash-and-fold-nyc/_lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/app/site/wash-and-fold-nyc/_lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/app/site/wash-and-fold-nyc/_lib/availability', () => ({
  checkAvailability: vi.fn(),
  getSmartSuggestions: vi.fn(),
  checkCleanerAvailability: vi.fn(),
}))

import { supabaseAdmin } from '@/app/site/wash-and-fold-nyc/_lib/supabase'
import { handleCreateBooking, type SelenaResult, EMPTY_CHECKLIST } from './selena'

const fake = supabaseAdmin as unknown as FakeSupabase

const CLIENT = 'client-1'
const CONVO = 'convo-1'

const TODAY = new Date().toLocaleDateString('en-CA')
const NOT_TODAY = '2020-01-01'

function seed() {
  fake._store.clear()
  fake._seed('sms_conversations', [
    { id: CONVO, client_id: CLIENT, bedrooms: 2, bathrooms: 1, booking_checklist: EMPTY_CHECKLIST },
  ])
}

function freshResult(): SelenaResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

describe('wash-and-fold-nyc handleCreateBooking — server-side $100 emergency rate + is_emergency', () => {
  it('same-day booking is forced to $100/hr, ignoring a lower LLM-supplied hourly_rate', async () => {
    seed()
    const input = { date: TODAY, time: '2:00 PM', service_type: 'deep', hourly_rate: 49, estimated_hours: 3 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)
    expect(parsed.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.hourly_rate).toBe(100)
    expect(booking?.price).toBe(100 * 3 * 100)
    expect(booking?.is_emergency).toBe(true)
  })

  it('non-same-day booking keeps the LLM-supplied rate and is not flagged emergency', async () => {
    seed()
    const input = { date: NOT_TODAY, time: '2:00 PM', service_type: 'regular', hourly_rate: 59, estimated_hours: 2 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.hourly_rate).toBe(59)
    expect(booking?.price).toBe(59 * 2 * 100)
    expect(booking?.is_emergency).toBe(false)
  })
})
