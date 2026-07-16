/**
 * P11.16/17 fix — handleCreateBooking (the AI/SMS create_booking tool) used
 * to trust the LLM's hourly_rate argument verbatim and never set is_emergency
 * on the row it inserted, even though the system prompt tells the AI about
 * selena_config's emergency_rate/emergency_available (buildSystemPrompt
 * L404-405, "Emergency/same-day rate"). A model that misreads or forgets the
 * configured rate could underbill same-day bookings with zero server-side
 * guardrail, and even a correctly-priced emergency booking was
 * indistinguishable from a routine one downstream (no urgency SMS, no badge).
 *
 * Fix: same-day is now determined server-side from the booking date, not
 * trusted from the LLM. When it's same-day and the tenant has
 * emergency_available + emergency_rate configured, that configured rate
 * overrides whatever hourly_rate the LLM supplied. is_emergency is set on
 * every same-day booking regardless of whether a rate is configured.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/availability', () => ({ checkAvailability: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/ai-usage', () => ({ logAnthropicUsage: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { handleCreateBooking, type SelenaConfig, type SelenaResult, EMPTY_CHECKLIST } from './selena-legacy'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const CONVO = 'convo-1'

const TODAY = new Date().toLocaleDateString('en-CA')
const NOT_TODAY = '2020-01-01'

function seed() {
  fake._store.clear()
  fake._seed('sms_conversations', [
    { id: CONVO, tenant_id: TENANT, client_id: CLIENT, phone: '5551234567', booking_checklist: EMPTY_CHECKLIST },
  ])
}

function freshResult(): SelenaResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

describe('handleCreateBooking — server-side emergency_rate + is_emergency enforcement', () => {
  it('same-day booking uses the configured emergency_rate, ignoring a lower LLM-supplied hourly_rate', async () => {
    seed()
    const config: SelenaConfig = { emergency_available: true, emergency_rate: 95 }
    const input = { date: TODAY, time: '2:00 PM', service_type: 'Deep Clean', hourly_rate: 40, estimated_hours: 3 }

    const raw = await handleCreateBooking(TENANT, input, CONVO, freshResult(), config)
    const parsed = JSON.parse(raw)
    expect(parsed.success).toBe(true)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.price).toBe(95 * 3 * 100)
    expect(booking?.is_emergency).toBe(true)
  })

  it('same-day booking with no emergency rate configured still flags is_emergency, keeps LLM rate', async () => {
    seed()
    const config: SelenaConfig = {}
    const input = { date: TODAY, time: '2:00 PM', service_type: 'Standard Clean', hourly_rate: 50, estimated_hours: 2 }

    const raw = await handleCreateBooking(TENANT, input, CONVO, freshResult(), config)
    const parsed = JSON.parse(raw)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.price).toBe(50 * 2 * 100)
    expect(booking?.is_emergency).toBe(true)
  })

  it('non-same-day booking is not flagged emergency and keeps the LLM-supplied rate', async () => {
    seed()
    const config: SelenaConfig = { emergency_available: true, emergency_rate: 95 }
    const input = { date: NOT_TODAY, time: '2:00 PM', service_type: 'Standard Clean', hourly_rate: 50, estimated_hours: 2 }

    const raw = await handleCreateBooking(TENANT, input, CONVO, freshResult(), config)
    const parsed = JSON.parse(raw)

    const booking = fake._store.get('bookings')?.find((b) => b.id === parsed.bookingId)
    expect(booking?.price).toBe(50 * 2 * 100)
    expect(booking?.is_emergency).toBe(false)
  })
})
