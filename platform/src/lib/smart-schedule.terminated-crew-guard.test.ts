import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * scoreTeamForBooking — terminated-crew guard (P1/W2 fresh-ground, gap #12).
 *
 * BUG (fixed here): this is the shared scoring pool behind admin/smart-schedule
 * (admin assignment UI), client/smart-schedule + client/book (the public
 * booking form's auto-suggest), AND the generate-recurring cron's smart-assign
 * path -- FOUR call sites. It filtered team_members on `.neq('status',
 * 'inactive')`, but HR termination never touches team_members.status/active
 * (deliberate -- see hr.ts, hr_status lives on hr_employee_profiles instead).
 * A fired employee could still be scored, suggested, and auto-picked for a
 * brand-new booking by every one of those four callers.
 *
 * FIX: exclude getTerminatedTeamMemberIds() up front, same as the existing
 * day-off/outside-hours/conflict/zone hard-blocks -- surfaced as
 * available:false with a clear reason instead of silently dropped or (worse)
 * silently scored and picked.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/geo', () => ({
  geocodeAddress: vi.fn(async () => null),
  calculateDistance: vi.fn(() => 0),
  estimateTransitMinutes: vi.fn(() => 0),
}))
vi.mock('@/lib/service-zones', () => ({
  guessZoneFromAddress: vi.fn(() => null),
  zoneRequiresCar: vi.fn(() => false),
}))
vi.mock('@/lib/day-availability', () => ({
  worksScheduledDay: () => true,
  slotWithinHours: () => true,
  hoursWindowForDate: () => null,
}))

import { scoreTeamForBooking, pickBestTeam } from './smart-schedule'

const CTX_TENANT = 'tid-a'

function seed() {
  return {
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry', status: 'active', working_days: null, schedule: null, unavailable_dates: null, service_zones: null },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', status: 'active', working_days: null, schedule: null, unavailable_dates: null, service_zones: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [] as Record<string, unknown>[],
    booking_team_members: [] as Record<string, unknown>[],
    clients: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const baseOpts = {
  tenantId: CTX_TENANT,
  date: '2026-08-10',
  startTime: '09:00',
  durationHours: 2,
  clientAddress: '123 Main St',
}

describe('scoreTeamForBooking — terminated-crew guard', () => {
  it('BLOCKED: a terminated member is scored unavailable with a clear reason, not silently dropped or picked', async () => {
    const scores = await scoreTeamForBooking(baseOpts)
    const terminated = scores.find((s) => s.id === 'tm-terminated')
    expect(terminated).toBeDefined()
    expect(terminated!.available).toBe(false)
    expect(terminated!.conflict).toBe('No longer employed')
    expect(terminated!.reason).toBe('terminated')
  })

  it('CONTROL: an active member still scores normally available', async () => {
    const scores = await scoreTeamForBooking(baseOpts)
    const active = scores.find((s) => s.id === 'tm-active')
    expect(active).toBeDefined()
    expect(active!.available).toBe(true)
  })

  it('pickBestTeam never selects a terminated member even with a strong score (client-preferred bonus)', async () => {
    // Give the terminated member the +200 "client's preferred tech" bonus --
    // the single strongest signal in the scorer -- to prove the terminated
    // filter runs BEFORE scoring, not as a tie-breaker after.
    h.seed.clients.push({ id: 'c-a', tenant_id: CTX_TENANT, preferred_team_member_id: 'tm-terminated' })
    const scores = await scoreTeamForBooking({ ...baseOpts, clientId: 'c-a' })
    const picked = pickBestTeam(scores, 1)
    expect(picked.lead?.id).not.toBe('tm-terminated')
    expect(picked.lead?.id).toBe('tm-active')
  })

  it('WRONG-TENANT PROBE: a same-id member terminated only in ANOTHER tenant is not blocked here', async () => {
    h.seed.hr_employee_profiles.push({
      id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated',
    })
    const scores = await scoreTeamForBooking(baseOpts)
    const active = scores.find((s) => s.id === 'tm-active')
    expect(active!.available).toBe(true)
  })
})
