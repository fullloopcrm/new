/**
 * Selena's owner-facing cleaner/team-management tools (tools.ts) were never
 * ported off nycmaid's pre-rename vocabulary. Three independent migration
 * comments establish fullloop's real convention:
 *   - src/lib/migrations/009_nycmaid_parity_columns.sql: "Rename-artifact
 *     cleaner_* cols intentionally skipped (fullloop uses team_member_*)."
 *   - src/app/api/cleaners/route.ts: "Legacy nycmaid path — /api/cleaners
 *     reads/writes team_members. Kept as thin compatibility shim."
 *   - supabase/smart_scheduling.sql: bookings.suggested_team_member_id /
 *     clients.preferred_team_member_id (not *_cleaner_id).
 *
 * `cleaners`, `booking_cleaners`, `cleaner_payouts`, `cleaner_blocks`,
 * `bookings.cleaner_id`, `bookings.suggested_cleaner_id`, and
 * `clients.preferred_cleaner_id` do not exist anywhere in the tracked
 * schema — every tool below either errored ("column/relation does not
 * exist") or silently wrote to the wrong table since inception. Worst hit:
 * `score_cleaners`, which agent.ts's own comment calls "the canonical
 * availability source... Yinez must use it for every slot quote on every
 * channel" — it was wired to `@/lib/nycmaid/smart-schedule` (queries
 * `cleaners`/`booking_cleaners`) instead of the real, current
 * `@/lib/smart-schedule` (queries `team_members`/`booking_team_members`).
 * `get_today_summary` (also the backbone of `get_briefing`) was fully
 * broken the same way.
 *
 * Fixed every call site to the real team_members/team_member_payouts/
 * booking_team_members tables and real column names, and (assign_cleaner_
 * to_booking) added the missing new-tech SMS the human PUT /api/bookings/[id]
 * path already sends on team-member assignment — a raw column flip
 * previously left the newly-assigned tech with zero signal, same
 * "mirror the human path's side effects" gap as items (86)/(93).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn().mockResolvedValue('tenant-1') }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn() }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

const sendSMSMock = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMSMock(...args) }))

// score_cleaners / get_smart_suggestion must call the CURRENT team_members-based
// module, never the legacy nycmaid/cleaners one — assert on the import itself.
const scoreTeamForBookingMock = vi.fn().mockResolvedValue([
  { id: 'member-1', name: 'Ana', score: 90, available: true, reason: 'closest', zone_match: true, has_car: true, home_by: '18:00', day_jobs: [] },
])
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: (...args: unknown[]) => scoreTeamForBookingMock(...args),
  suggestBookingSlots: vi.fn().mockResolvedValue([]),
}))
const scoreCleanersForBookingMock = vi.fn().mockResolvedValue([])
vi.mock('@/lib/nycmaid/smart-schedule', () => ({
  scoreCleanersForBooking: (...args: unknown[]) => scoreCleanersForBookingMock(...args),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const OWNER_PHONE = '+12125551234'
const result = () => ({ text: '', toolsCalled: [] as string[] })

async function owner(name: string, input: Record<string, unknown>) {
  const out = await runTool(name, input, 'convo-1', OWNER_PHONE, result(), TENANT_ID, true)
  return JSON.parse(out)
}

beforeEach(() => {
  fake._store.clear()
  process.env.OWNER_PHONES = OWNER_PHONE
  sendSMSMock.mockClear()
  scoreTeamForBookingMock.mockClear()
  scoreCleanersForBookingMock.mockClear()
})

describe('score_cleaners uses the real team_members-based smart-schedule module', () => {
  it('calls scoreTeamForBooking (@/lib/smart-schedule), never the legacy nycmaid one', async () => {
    const out = await owner('score_cleaners', { date: '2026-08-01', time: '10:00', duration_hours: 2 })
    expect(out.error).toBeUndefined()
    expect(scoreTeamForBookingMock).toHaveBeenCalledTimes(1)
    expect(scoreCleanersForBookingMock).not.toHaveBeenCalled()
    expect(out.cleaners[0].name).toBe('Ana')
  })
})

describe('get_smart_suggestion reads real bookings columns and team_members join', () => {
  it('resolves team_member_id/suggested_team_member_id and the team_members(name) join, not cleaner_id/cleaners', async () => {
    fake._seed('bookings', [{
      id: 'booking-1', tenant_id: TENANT_ID, start_time: '2026-08-01T14:00:00', end_time: '2026-08-01T16:00:00',
      hourly_rate: 50, status: 'pending', team_member_id: null, suggested_team_member_id: null, suggested_reason: null,
      client_id: 'client-1', clients: { name: 'Jane', address: '1 Main St' }, team_members: { name: 'Ana' },
    }])
    const out = await owner('get_smart_suggestion', { booking_id: 'booking-1' })
    expect(out.error).toBeUndefined()
    expect(out.assigned_cleaner).toBe('Ana')
    expect(scoreTeamForBookingMock).toHaveBeenCalledTimes(1)
  })
})

describe('get_today_summary (and the get_briefing it backs) reads team_members/team_member_payouts', () => {
  it('surfaces cleaner names on duty and pending payouts from the real tables', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    fake._seed('bookings', [{
      id: 'b1', tenant_id: TENANT_ID, status: 'scheduled', hourly_rate: 50, team_member_id: 'member-1',
      clients: { name: 'Jane' }, team_members: { name: 'Ana' },
      start_time: `${today}T10:00:00`, end_time: `${today}T12:00:00`,
    }])
    fake._seed('team_member_payouts', [
      { id: 'payout-1', tenant_id: TENANT_ID, status: 'pending', amount: 5000, team_member_id: 'member-1', team_members: { name: 'Ana' } },
    ])
    const out = await owner('get_today_summary', {})
    expect(out.error).toBeUndefined()
    expect(out.cleaners_on_duty).toEqual(['Ana'])
    expect(out.bookings_today[0].cleaner).toBe('Ana')
    expect(out.payouts_pending_count).toBe(1)
    expect(out.payouts_pending_total).toBe('$50')
  })
})

describe('assign_cleaner_to_booking writes team_member_id and notifies the new tech', () => {
  it('sets bookings.team_member_id (not cleaner_id) and sends a job-assignment SMS', async () => {
    fake._seed('bookings', [{ id: 'booking-1', tenant_id: TENANT_ID, status: 'pending', start_time: '2026-08-01T14:00:00', clients: { name: 'Jane' } }])
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT_ID, name: 'Ana', phone: '+12125559999' }])
    const out = await owner('assign_cleaner_to_booking', { booking_id: 'booking-1', cleaner_id: 'member-1' })
    expect(out.error).toBeUndefined()
    const booking = fake._all('bookings').find((b) => b.id === 'booking-1')
    expect(booking?.team_member_id).toBe('member-1')
    expect(booking?.cleaner_id).toBeUndefined()
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock.mock.calls[0][0]).toBe('+12125559999')
  })
})

describe('create_manual_booking writes team_member_id/suggested_team_member_id', () => {
  it('leaves team_member_id null and stores the suggested tech under suggested_team_member_id', async () => {
    const out = await owner('create_manual_booking', {
      client_id: 'client-1', date: '2026-08-01', time: '10am', service_type: 'Cleaning',
      hourly_rate: 50, estimated_hours: 2, cleaner_id: 'member-1',
    })
    expect(out.error).toBeUndefined()
    const booking = fake._all('bookings').find((b) => b.id === out.booking_id)
    expect(booking?.team_member_id).toBeNull()
    expect(booking?.suggested_team_member_id).toBe('member-1')
    expect(booking?.suggested_cleaner_id).toBeUndefined()
  })
})

describe('list_bookings filters by team_member_id and joins booking_team_members', () => {
  it('cleaner_id input filters on the real team_member_id column', async () => {
    fake._seed('bookings', [
      { id: 'b1', tenant_id: TENANT_ID, team_member_id: 'member-1', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
      { id: 'b2', tenant_id: TENANT_ID, team_member_id: 'member-2', start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' },
    ])
    const out = await owner('list_bookings', { date: '2026-08-01', cleaner_id: 'member-1' })
    expect(out.error).toBeUndefined()
    expect(out.count).toBe(1)
    expect(out.bookings[0].id).toBe('b1')
  })
})

describe('cleaner CRUD tools operate on team_members, not a nonexistent cleaners table', () => {
  it('create_cleaner inserts into team_members with service_zones as an array', async () => {
    const out = await owner('create_cleaner', { name: 'Ana', phone: '+12125559999', zone: 'Manhattan' })
    expect(out.error).toBeUndefined()
    expect(fake._all('cleaners').length).toBe(0)
    const member = fake._all('team_members').find((m) => m.id === out.cleaner_id)
    expect(member?.service_zones).toEqual(['Manhattan'])
  })

  it('update_cleaner translates the "zone" field to service_zones on team_members', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT_ID, name: 'Ana' }])
    const out = await owner('update_cleaner', { cleaner_id: 'member-1', fields: { zone: 'Brooklyn', status: 'active' } })
    expect(out.error).toBeUndefined()
    const member = fake._all('team_members').find((m) => m.id === 'member-1')
    expect(member?.service_zones).toEqual(['Brooklyn'])
    expect(member?.status).toBe('active')
  })

  it('deactivate_cleaner sets team_members.status, not a cleaners row', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT_ID, name: 'Ana', status: 'active' }])
    const out = await owner('deactivate_cleaner', { cleaner_id: 'member-1' })
    expect(out.error).toBeUndefined()
    expect(fake._all('team_members').find((m) => m.id === 'member-1')?.status).toBe('inactive')
  })

  it('list_cleaners reads team_members and surfaces the first service zone as "zone"', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT_ID, name: 'Ana', status: 'active', service_zones: ['Queens'], phone: '+1', hourly_rate: 30 }])
    const out = await owner('list_cleaners', {})
    expect(out.error).toBeUndefined()
    expect(out.count).toBe(1)
    expect(out.cleaners[0].zone).toBe('Queens')
  })
})

describe('block_cleaner_dates merges into team_members.unavailable_dates (no cleaner_blocks table)', () => {
  it('expands the date range and merges with existing unavailable_dates', async () => {
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT_ID, name: 'Ana', unavailable_dates: ['2026-08-05'] }])
    const out = await owner('block_cleaner_dates', { cleaner_id: 'member-1', from_date: '2026-08-10', to_date: '2026-08-12', reason: 'vacation' })
    expect(out.error).toBeUndefined()
    expect(fake._all('cleaner_blocks').length).toBe(0)
    const member = fake._all('team_members').find((m) => m.id === 'member-1')
    expect(member?.unavailable_dates).toEqual(['2026-08-05', '2026-08-10', '2026-08-11', '2026-08-12'])
  })
})

describe('mark_payout_paid updates team_member_payouts, not cleaner_payouts', () => {
  it('sets status=paid on the real table', async () => {
    fake._seed('team_member_payouts', [{ id: 'payout-1', tenant_id: TENANT_ID, status: 'pending' }])
    const out = await owner('mark_payout_paid', { payout_id: 'payout-1' })
    expect(out.error).toBeUndefined()
    expect(fake._all('team_member_payouts').find((p) => p.id === 'payout-1')?.status).toBe('paid')
  })
})

describe('lookup_client resolves preferred_team_member_id, not preferred_cleaner_id', () => {
  it('looks up the preferred team member by the real column', async () => {
    fake._seed('clients', [{ id: 'client-1', tenant_id: TENANT_ID, name: 'Jane', phone: '+12125550000', preferred_team_member_id: 'member-1' }])
    fake._seed('team_members', [{ id: 'member-1', tenant_id: TENANT_ID, name: 'Ana' }])
    const out = await owner('lookup_client', { query: 'Jane' })
    expect(out.error).toBeUndefined()
    expect(out.matches[0].preferred_cleaner).toBe('Ana')
  })
})

describe('cleaner application approve/reject use the real cleaner_applications columns', () => {
  it('approve_cleaner_application creates a team_members row and sets status=accepted (not "approved")', async () => {
    fake._seed('cleaner_applications', [{ id: 'app-1', tenant_id: TENANT_ID, name: 'Ana', phone: '+1', email: null, service_zones: ['Bronx'], has_car: true, status: 'pending' }])
    const out = await owner('approve_cleaner_application', { application_id: 'app-1' })
    expect(out.error).toBeUndefined()
    expect(fake._all('cleaners').length).toBe(0)
    const member = fake._all('team_members').find((m) => m.id === out.cleaner_id)
    expect(member?.name).toBe('Ana')
    expect(member?.service_zones).toEqual(['Bronx'])
    const app = fake._all('cleaner_applications').find((a) => a.id === 'app-1')
    expect(app?.status).toBe('accepted')
    expect(app?.reviewed_at).toBeTruthy()
  })

  it('reject_cleaner_application sets status=rejected + reviewed_at, appends reason to notes (no rejected_reason/rejected_at columns)', async () => {
    fake._seed('cleaner_applications', [{ id: 'app-1', tenant_id: TENANT_ID, name: 'Ana', status: 'pending', notes: null }])
    const out = await owner('reject_cleaner_application', { application_id: 'app-1', reason: 'no coverage in zone' })
    expect(out.error).toBeUndefined()
    const app = fake._all('cleaner_applications').find((a) => a.id === 'app-1')
    expect(app?.status).toBe('rejected')
    expect(app?.reviewed_at).toBeTruthy()
    expect(app?.notes).toMatch(/no coverage in zone/)
    expect(app?.rejected_reason).toBeUndefined()
  })
})
