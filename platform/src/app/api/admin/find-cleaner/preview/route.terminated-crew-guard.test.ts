import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/find-cleaner/preview — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Same gap class as every other assignment-adjacent surface this lane has
 * closed: `team_members.status` never reflects HR termination (deliberate
 * split — see the identical comment in team-portal-auth.ts / smart-schedule.ts
 * / client/recurring / client/reschedule / cron/generate-recurring). This
 * route's eligibility query only filtered `.eq('status', 'active')`, so a
 * fired worker's row (still status:'active') showed up "eligible" here, and
 * the sibling POST /send would actually text them asking if they're
 * available for a paid shift.
 *
 * FIX: cross-reference getTerminatedTeamMemberIds and exclude with reason
 * 'No longer employed'.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    })),
  }
})

import { POST } from './route'

// Both members match TEST_CLEANER_NAME_SUBSTRING ('jeff tucker') so TEST_MODE's
// own exclusion reason doesn't mask which reason is actually under test.
function seed() {
  return {
    team_members: [
      {
        id: 'tm-terminated', tenant_id: A, name: 'Jeff Tucker Fired', phone: '+15559990001',
        status: 'active', working_days: null, schedule: null, unavailable_dates: [],
        service_zones: [], has_car: true, max_jobs_per_day: null, hourly_rate: 25, preferred_language: 'en',
      },
      {
        id: 'tm-active', tenant_id: A, name: 'Jeff Tucker Employed', phone: '+15559990002',
        status: 'active', working_days: null, schedule: null, unavailable_dates: [],
        service_zones: [], has_car: true, max_jobs_per_day: null, hourly_rate: 25, preferred_language: 'en',
      },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ job_date: '2026-08-01', start_time: '09:00', duration_hours: 2 }),
  })
}

describe('POST /api/admin/find-cleaner/preview — terminated-crew guard', () => {
  it('BLOCKED: a terminated worker is excluded with "No longer employed", not "eligible"', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligible.find((c: { id: string }) => c.id === 'tm-terminated')).toBeUndefined()
    const excluded = body.excluded.find((c: { id: string }) => c.id === 'tm-terminated')
    expect(excluded).toBeDefined()
    expect(excluded.eligible).toBe(false)
    expect(excluded.reasons_excluded).toContain('No longer employed')
  })

  it('CONTROL: an active worker with no other conflicts is eligible, no HR-status reason attached', async () => {
    const res = await POST(req())
    const body = await res.json()
    const eligible = body.eligible.find((c: { id: string }) => c.id === 'tm-active')
    expect(eligible).toBeDefined()
    expect(eligible.eligible).toBe(true)
    expect(eligible.reasons_excluded).toEqual([])
  })
})
