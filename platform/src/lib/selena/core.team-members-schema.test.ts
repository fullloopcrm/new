import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * core.ts (Yinez's SMS-channel engine, /api/yinez's handler) had the exact
 * same pre-rename nycmaid vocabulary as tools.ts (see tools.team-members-
 * schema.test.ts): `cleaners`/`cleaner_id`/`cleaner_pay`/`suggested_cleaner_id`
 * do not exist in the tracked schema (supabase/schema.sql) -- the real
 * tables/columns are team_members/team_member_id/pay_rate/
 * suggested_team_member_id.
 *
 * Worst hit was handleConfirmPayment (confirm_payment): its own .select()
 * asked for the nonexistent `cleaner_id` column and `cleaners(...)` relation
 * on `bookings` -- since the whole select errors when any requested column/
 * relation doesn't exist, `booking` was ALWAYS null, and the code never
 * checks the query's `error` (only destructures `data: booking`). That
 * silently skipped payment_method/payment_sender_name being recorded AND
 * skipped the admin "client says paid" notification for every single SMS
 * payment confirmation, with no error surfaced anywhere.
 *
 * isCleanerPhone also queried a nonexistent `cleaners` table with
 * `.eq('active', true)` instead of team_members.status = 'active', so it
 * never matched a real team member's phone.
 *
 * handleCreateBooking also still imported scoreCleanersForBooking from the
 * legacy `@/lib/nycmaid/smart-schedule` (queries `cleaners`) instead of the
 * current `@/lib/smart-schedule`'s scoreTeamForBooking (queries
 * team_members) -- same "wrong scoring module" bug already fixed in
 * tools.ts's score_cleaners/get_smart_suggestion.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn() }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ ok: true }) }))

const notifyMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/nycmaid/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const scoreTeamForBookingMock = vi.fn().mockResolvedValue([])
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: (...args: unknown[]) => scoreTeamForBookingMock(...args),
}))
const scoreCleanersForBookingMock = vi.fn().mockResolvedValue([])
vi.mock('@/lib/nycmaid/smart-schedule', () => ({
  scoreCleanersForBooking: (...args: unknown[]) => scoreCleanersForBookingMock(...args),
}))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { isCleanerPhone, getClientProfile, handleTool, EMPTY_CHECKLIST, type YinezResult } from '@/lib/selena/core'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT = 'tenant-1'

const emptyResult = (): YinezResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  scoreTeamForBookingMock.mockClear()
  scoreCleanersForBookingMock.mockClear()
})

describe('isCleanerPhone reads team_members.status, not a cleaners table / active column', () => {
  it('matches a real team member by status=active', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT, name: 'Ana', phone: '2125559999', status: 'active' }])
    const out = await isCleanerPhone('2125559999', TENANT)
    expect(out.isCleaner).toBe(true)
    expect(out.name).toBe('Ana')
  })

  it('does not match an inactive team member', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT, name: 'Ana', phone: '2125559999', status: 'inactive' }])
    const out = await isCleanerPhone('2125559999', TENANT)
    expect(out.isCleaner).toBe(false)
  })
})

describe('confirm_payment resolves booking via team_member_id/team_members, not cleaner_id/cleaners', () => {
  it('finds the booking, records payment_method, and notifies admin (previously always no-op)', async () => {
    fake._seed('bookings', [{
      id: 'booking-1', tenant_id: TENANT, client_id: 'client-1', payment_status: 'unpaid',
      fifteen_min_alert_time: '2026-08-01T13:45:00', start_time: '2026-08-01T14:00:00',
      team_member_id: 'member-1', clients: { name: 'Jane' }, team_members: { name: 'Ana', phone: '2125559999', sms_consent: true },
    }])
    fake._seed('sms_conversations', [{ id: 'convo-1', tenant_id: TENANT, client_id: 'client-1' }])

    const out = JSON.parse(await handleTool('confirm_payment', { method: 'zelle', sender_name: 'Jane' }, 'convo-1', emptyResult()))
    expect(out.success).toBe(true)

    const booking = fake._all('bookings').find((b) => b.id === 'booking-1')
    expect(booking?.payment_method).toBe('zelle')
    expect(booking?.payment_sender_name).toBe('Jane')
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'payment_claimed', booking_id: 'booking-1' })
  })
})

describe('lookup_bookings surfaces cleaner name via the team_members join', () => {
  it('reads team_members(name), not cleaners(name)', async () => {
    fake._seed('sms_conversations', [{ id: 'convo-1', tenant_id: TENANT, client_id: 'client-1' }])
    fake._seed('bookings', [{
      id: 'booking-1', tenant_id: TENANT, client_id: 'client-1', status: 'scheduled',
      start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', hourly_rate: 50,
      payment_status: 'unpaid', recurring_type: null, team_members: { name: 'Ana' },
    }])
    const out = JSON.parse(await handleTool('lookup_bookings', {}, 'convo-1', emptyResult()))
    expect(out.bookings[0].cleaner).toBe('Ana')
  })
})

describe('getClientProfile surfaces preferred/recent cleaner via team_members, not cleaners', () => {
  it('resolves the most-booked team member name from completed bookings', async () => {
    fake._seed('clients', [{
      id: 'client-1', tenant_id: TENANT, name: 'Jane', phone: '2125550000', notes: null,
      active: true, do_not_service: false, created_at: new Date().toISOString(),
    }])
    fake._seed('bookings', [
      { id: 'b1', tenant_id: TENANT, client_id: 'client-1', status: 'completed', start_time: '2026-07-01T10:00:00', hourly_rate: 50, price: 10000, payment_status: 'paid', team_members: { name: 'Ana' } },
      { id: 'b2', tenant_id: TENANT, client_id: 'client-1', status: 'completed', start_time: '2026-07-08T10:00:00', hourly_rate: 50, price: 10000, payment_status: 'paid', team_members: { name: 'Ana' } },
    ])
    fake._seed('yinez_memory', [])
    const out = JSON.parse(await getClientProfile('2125550000', TENANT))
    expect(out.error).toBeUndefined()
    expect(out.preferred_cleaner).toBe('Ana')
    expect(out.recent_bookings[0].cleaner).toBe('Ana')
  })
})
