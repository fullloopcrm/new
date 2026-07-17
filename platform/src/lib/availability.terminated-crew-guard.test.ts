import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * checkTeamAvailability — terminated-crew guard (P1/W2 fresh-ground).
 *
 * BUG (fixed here): this function backs the admin calendar's reassignment
 * panel (/api/team-availability, CalendarBoard.tsx) and
 * /api/admin/team-availability-batch -- TWO call sites. It filtered
 * team_members on `.eq('status', 'active')`, but HR termination never
 * touches team_members.status/active (deliberate -- hr_status lives on
 * hr_employee_profiles instead, see hr.ts). A fired employee could still be
 * listed "Available" and picked for an existing booking's reassignment.
 * scoreTeamForBooking (smart-schedule.ts) already carries the identical
 * guard for ITS four callers (see smart-schedule.terminated-crew-guard.test.ts)
 * -- this closes the same gap for this sibling function, which was missed.
 *
 * FIX: exclude getTerminatedTeamMemberIds() up front, before the day-off/
 * conflict checks, surfaced as available:false with a clear reason instead
 * of silently listed as a normal pick.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/day-availability', () => ({
  worksScheduledDay: () => true,
  slotWithinHours: () => true,
}))
vi.mock('@/lib/holidays', () => ({ isHoliday: () => null }))

import { checkTeamAvailability } from './availability'

const CTX_TENANT = 'tid-a'

function seed() {
  return {
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry', status: 'active', working_days: null, schedule: null, unavailable_dates: null },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', status: 'active', working_days: null, schedule: null, unavailable_dates: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('checkTeamAvailability — terminated-crew guard', () => {
  it('BLOCKED: a terminated member is listed unavailable with a clear reason, not silently offered', async () => {
    const members = await checkTeamAvailability(CTX_TENANT, '2026-08-10', '09:00', 2)
    const terminated = members.find(m => m.id === 'tm-terminated')
    expect(terminated).toBeDefined()
    expect(terminated!.available).toBe(false)
    expect(terminated!.conflict).toBe('No longer employed')
  })

  it('CONTROL: an active member still lists normally available', async () => {
    const members = await checkTeamAvailability(CTX_TENANT, '2026-08-10', '09:00', 2)
    const active = members.find(m => m.id === 'tm-active')
    expect(active).toBeDefined()
    expect(active!.available).toBe(true)
  })

  it('WRONG-TENANT PROBE: a same-id member terminated only in ANOTHER tenant is not blocked here', async () => {
    h.seed.hr_employee_profiles.push({
      id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated',
    })
    const members = await checkTeamAvailability(CTX_TENANT, '2026-08-10', '09:00', 2)
    const active = members.find(m => m.id === 'tm-active')
    expect(active!.available).toBe(true)
  })
})
