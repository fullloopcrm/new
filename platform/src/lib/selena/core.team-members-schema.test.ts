/**
 * Item (95) fixed handleCreateBooking's `cleaners`/`suggested_cleaner_id`
 * bug (item (94)'s flagged-not-fixed open question), but a full sweep of
 * the rest of core.ts turned up the identical wrong-vocabulary shape
 * repeated across ~8 more call sites, none of them caught by item (94)'s
 * tools.ts-only audit because they live in a different file:
 *
 * - `isCleanerPhone` — staff-phone detection queried `.from('cleaners')`
 *   with a bare boolean `active` column; the real `team_members` table has
 *   no `active` column, only `status` ('active'|'inactive'|'suspended').
 * - `handleGetAccount` (`get_account`) — both its upcoming-bookings and
 *   recurring-schedule queries joined `cleaners(name)`.
 * - `handleResendConfirmation` (`resend_confirmation`) — joined
 *   `cleaners(name)` on the booking-confirmation email lookup.
 * - `handleConfirmPayment` (`confirm_payment`) — selected `cleaner_id` and
 *   joined `cleaners(name, phone, sms_consent)`, both unused downstream but
 *   still enough to fail the query outright against a real Postgres schema.
 * - `handleLookupBookings` (`lookup_bookings`) — joined `cleaners(name)`.
 * - `handleBookingDetails` (`booking_details`) — selected the nonexistent
 *   `cleaner_pay` column (real column `team_member_pay`) and joined
 *   `cleaners(name)`.
 * - `getClientProfile` — two separate queries joined `cleaners(name)`,
 *   feeding both the "preferred cleaner" tally and the upcoming/recent
 *   booking lists.
 *
 * Fixed every site to the real `team_members` table, `status`/`team_member_id`/
 * `team_member_pay` columns, and `team_members(name)` joins — same mapping
 * item (94) established for tools.ts. This file's in-memory Supabase fake
 * (`fake-supabase.ts`) intentionally ignores the `.select()` column-list
 * string (it returns whole seeded rows, faithful to `.eq`/`.in`/etc filter
 * semantics only, not join validation) — so these tests seed the embedded
 * relation object directly and assert the handler reads it under the
 * `team_members` key, not `cleaners`. Against real Postgres/PostgREST, the
 * un-fixed `cleaners(name)` join would 400 the whole query outright.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
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

import { supabaseAdmin } from '@/lib/supabase'
import { isCleanerPhone, handleTool, handleBookingDetails, getClientProfile, EMPTY_CHECKLIST, type YinezResult } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const CONVO = 'convo-1'

function freshResult(): YinezResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

beforeEach(() => {
  fake._store.clear()
})

describe('isCleanerPhone reads team_members.status, not cleaners.active', () => {
  it('matches an active team member by phone', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT, name: 'Ana', phone: '5551234567', status: 'active' }])
    const out = await isCleanerPhone('5551234567', TENANT)
    expect(out.isCleaner).toBe(true)
    expect(out.name).toBe('Ana')
  })

  it('does not match an inactive team member', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT, name: 'Ana', phone: '5551234567', status: 'inactive' }])
    const out = await isCleanerPhone('5551234567', TENANT)
    expect(out.isCleaner).toBe(false)
  })
})

describe('get_account joins team_members(name), not cleaners(name)', () => {
  it('surfaces the assigned tech on an upcoming booking and a recurring schedule', async () => {
    fake._seed('sms_conversations', [{ id: CONVO, tenant_id: TENANT, client_id: CLIENT, phone: '5551234567' }])
    fake._seed('clients', [{ id: CLIENT, tenant_id: TENANT, name: 'Jane', created_at: '2026-01-01T00:00:00Z' }])
    fake._seed('bookings', [{
      id: 'b1', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', service_type: 'regular', hourly_rate: 69,
      payment_status: 'unpaid', start_time: '2099-01-01T10:00:00', team_members: { name: 'Ana' },
    }])
    fake._seed('recurring_schedules', [{
      id: 'r1', tenant_id: TENANT, client_id: CLIENT, status: 'active', recurring_type: 'weekly',
      day_of_week: 1, preferred_time: '10:00', team_members: { name: 'Ana' },
    }])

    const out = JSON.parse(await handleTool('get_account', {}, CONVO, freshResult()))
    expect(out.error).toBeUndefined()
    expect(out.upcoming[0].cleaner).toBe('Ana')
    expect(out.recurring[0].cleaner).toBe('Ana')
  })
})

describe('lookup_bookings joins team_members(name), not cleaners(name)', () => {
  it('surfaces the assigned tech on each returned booking', async () => {
    fake._seed('sms_conversations', [{ id: CONVO, tenant_id: TENANT, client_id: CLIENT, phone: '5551234567' }])
    fake._seed('bookings', [{
      id: 'b1', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', service_type: 'regular',
      hourly_rate: 69, payment_status: 'unpaid', recurring_type: 'one_time',
      start_time: '2099-01-01T10:00:00', end_time: '2099-01-01T12:00:00', team_members: { name: 'Ana' },
    }])

    const out = JSON.parse(await handleTool('lookup_bookings', {}, CONVO, freshResult()))
    expect(out.error).toBeUndefined()
    expect(out.bookings[0].cleaner).toBe('Ana')
  })
})

describe('booking_details reads team_member_pay and team_members(name), not cleaner_pay/cleaners(name)', () => {
  it('surfaces the assigned tech name (pay is internal-only, not asserted here)', async () => {
    fake._seed('sms_conversations', [{ id: CONVO, tenant_id: TENANT, client_id: CLIENT, phone: '5551234567' }])
    fake._seed('bookings', [{
      id: 'b1', tenant_id: TENANT, client_id: CLIENT, status: 'completed', service_type: 'regular',
      start_time: '2026-01-01T10:00:00', end_time: '2026-01-01T12:00:00', hourly_rate: 69, actual_hours: 2,
      team_member_pay: 4000, team_members: { name: 'Ana' }, clients: { name: 'Jane', address: '1 Main St' },
    }])

    const out = JSON.parse(await handleBookingDetails({ booking_id: 'b1' }, CONVO))
    expect(out.error).toBeUndefined()
    expect(out.cleaner).toBe('Ana')
  })
})

describe('getClientProfile joins team_members(name), not cleaners(name), for both booking queries', () => {
  it('tallies the preferred tech and surfaces cleaner names on upcoming/recent bookings', async () => {
    fake._seed('clients', [{ id: CLIENT, tenant_id: TENANT, name: 'Jane', phone: '5551234567' }])
    fake._seed('bookings', [
      { id: 'b1', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled', start_time: '2099-01-01T10:00:00', service_type: 'regular', hourly_rate: 69, team_members: { name: 'Ana' } },
      { id: 'b2', tenant_id: TENANT, client_id: CLIENT, status: 'completed', start_time: '2026-01-01T10:00:00', service_type: 'regular', hourly_rate: 69, team_members: { name: 'Ana' } },
    ])

    const out = JSON.parse(await getClientProfile('5551234567', TENANT))
    expect(out.error).toBeUndefined()
    expect(out.preferred_cleaner).toBe('Ana')
    expect(out.upcoming[0].cleaner).toBe('Ana')
    expect(out.recent_bookings.some((b: { cleaner: string }) => b.cleaner === 'Ana')).toBe(true)
  })
})
