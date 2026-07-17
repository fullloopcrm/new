import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * stageScheduleBatch — terminated-crew guard (P1/W2 fresh-ground).
 *
 * Same gap class as every other team_member_id assignment path already fixed
 * this session (POST /api/bookings, admin/recurring-schedules, the
 * generate-recurring cron, client/recurring, client/reschedule): a write path
 * that resolves a team_member_id and never checked hr_status. This is the
 * REAL, live schedule-import path — ImportWizard (kind="schedules") posts to
 * POST /api/dashboard/import/stage, which calls this function directly (the
 * older direct-write POST /api/dashboard/schedules/import route it super-
 * seded has zero remaining callers anywhere in the app, confirmed by repo-
 * wide grep — dead code, fixed defensively but not the live gap).
 *
 * stageScheduleBatch matches staff purely by NAME against every team_members
 * row for the tenant with no HR filter, so a row naming an already-
 * terminated employee (a stale export, or a re-run after the tenant let
 * someone go) would stage a real assignment straight through commitBatch's
 * raw insert into bookings.team_member_id / recurring_schedules.team_member_id.
 *
 * FIX: matched staff ids are checked against getTerminatedTeamMemberIds
 * before rows are built. A terminated match still stages as 'matched'
 * (committed) — never drop a real client's appointment — but unassigned,
 * with match_detail set so the operator sees it on the review screen
 * (dashboard/import/review/[batchId], which already renders match_detail
 * per row) before ever confirming the commit.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { stageScheduleBatch, getBatchReview } from './import-staging'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [{ id: 'c1', tenant_id: A, name: 'Jane Client', phone: '2125551234' }],
    team_members: [
      { id: 'tm-terminated', tenant_id: A, name: 'Fired Fran' },
      { id: 'tm-active', tenant_id: A, name: 'Active Alex' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    import_batches: [],
    import_rows: [],
  })
  holder.from = h.from
})

describe('stageScheduleBatch — terminated-crew guard', () => {
  it('BLOCKED: a one-time-booking row naming a terminated staff member stages matched-but-unassigned, with a review-visible detail', async () => {
    const batchId = await stageScheduleBatch(A, [
      { client_name: 'Jane Client', staff_name: 'Fired Fran', start: '2026-08-01T10:00:00Z', duration_hours: '2', service_type: 'Clean' },
    ])
    const review = await getBatchReview(batchId)
    const row = review!.rows[0]
    expect(row.match_status).toBe('matched')
    expect(row.mapped.team_member_id).toBeNull()
    expect(row.match_detail).toBe('staff "Fired Fran" is no longer active — imported unassigned')
  })

  it('BLOCKED: a recurring-schedule row naming a terminated staff member stages matched-but-unassigned, with a review-visible detail', async () => {
    const batchId = await stageScheduleBatch(A, [
      { client_name: 'Jane Client', staff_name: 'Fired Fran', recurring_type: 'weekly', day_of_week: 'monday', preferred_time: '09:00' },
    ])
    const review = await getBatchReview(batchId)
    const row = review!.rows[0]
    expect(row.match_status).toBe('matched')
    expect(row.mapped.team_member_id).toBeNull()
    expect(row.match_detail).toContain('no longer active')
  })

  it('CONTROL: an active staff member still stages assigned, with no detail', async () => {
    const batchId = await stageScheduleBatch(A, [
      { client_name: 'Jane Client', staff_name: 'Active Alex', start: '2026-08-01T10:00:00Z', duration_hours: '2', service_type: 'Clean' },
    ])
    const review = await getBatchReview(batchId)
    const row = review!.rows[0]
    expect(row.match_status).toBe('matched')
    expect(row.mapped.team_member_id).toBe('tm-active')
    expect(row.match_detail).toBeUndefined()
  })
})
