/**
 * core.ts's handleCreateBooking (the `create_booking` tool's real
 * implementation, its own comment calling it "the platform's most-used AI
 * booking assistant") had the same bug shape item (94) fixed in tools.ts:
 * it imported `scoreCleanersForBooking` from the legacy
 * `@/lib/nycmaid/smart-schedule` (queries `cleaners`/`booking_cleaners`,
 * neither of which exist) and inserted `suggested_cleaner_id` into
 * `bookings` (real column `suggested_team_member_id`). Live prod schema
 * confirmed `cleaners` does not exist and `bookings` has zero
 * cleaner_id-related columns, so every AI-created booking that reached the
 * insert would have errored, or (if suggested_cleaner_id also errored
 * silently upstream) never carried a suggested tech through to the row.
 *
 * Fixed: same `@/lib/smart-schedule`'s `scoreTeamForBooking` tools.ts now
 * uses, and `suggested_team_member_id` on the insert.
 */
import { describe, it, expect, vi } from 'vitest'
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
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))

const scoreTeamForBookingMock = vi.fn().mockResolvedValue([
  { id: 'member-1', name: 'Ana', score: 90, available: true, reason: 'closest', zone_match: true, has_car: true, home_by: '18:00' },
])
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: (...args: unknown[]) => scoreTeamForBookingMock(...args),
}))
const scoreCleanersForBookingMock = vi.fn().mockResolvedValue([])
vi.mock('@/lib/nycmaid/smart-schedule', () => ({
  scoreCleanersForBooking: (...args: unknown[]) => scoreCleanersForBookingMock(...args),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { handleCreateBooking, EMPTY_CHECKLIST, type YinezResult } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const CONVO = 'convo-1'
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

describe('handleCreateBooking uses the real team_members-based smart-schedule module and column', () => {
  it('calls scoreTeamForBooking (@/lib/smart-schedule), never the legacy nycmaid one', async () => {
    seed()
    scoreTeamForBookingMock.mockClear()
    scoreCleanersForBookingMock.mockClear()
    const input = { date: NOT_TODAY, time: '2:00 PM', service_type: 'regular', hourly_rate: 69, estimated_hours: 2 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)

    expect(parsed.success).toBe(true)
    expect(scoreTeamForBookingMock).toHaveBeenCalledTimes(1)
    expect(scoreCleanersForBookingMock).not.toHaveBeenCalled()
  })

  it('writes the top score to bookings.suggested_team_member_id, not suggested_cleaner_id', async () => {
    seed()
    const input = { date: NOT_TODAY, time: '2:00 PM', service_type: 'regular', hourly_rate: 69, estimated_hours: 2 }

    const raw = await handleCreateBooking(input, CONVO, freshResult())
    const parsed = JSON.parse(raw)

    const booking = fake._all('bookings').find((b) => b.id === parsed.bookingId)
    expect(booking?.suggested_team_member_id).toBe('member-1')
    expect(booking?.suggested_cleaner_id).toBeUndefined()
    expect(parsed.suggested_cleaner).toBe('closest')
  })
})
