/**
 * POST /api/jobs/[id]/sessions -- booking_team_members lead/extras-sync gap.
 *
 * This route creates a booking and assigns it via booking_assignees (its own
 * Jobs-UI display join, 2026_07_03_booking_assignees.sql) plus
 * bookings.team_member_id for the lead -- but GET /api/bookings/:id/team and
 * closeout-summary (the SAME widgets a job-session booking shows up in: it's
 * just a `bookings` row carrying a job_id, unfiltered from the general
 * Bookings admin list/API) source the multi-tech team from
 * booking_team_members instead. Without this, a session's non-lead crew
 * members were invisible to both, and closeout payout attribution silently
 * paid out only the lead. Same booking_team_members-sync gap fixed at every
 * other bookings.team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/jobs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/jobs')>('@/lib/jobs')
  return { ...actual, logJobEvent: vi.fn(async () => {}) }
})

import { POST } from './route'

const TENANT_ID = 'tenant-A'
const JOB_ID = 'job-1'
const MEMBER_1 = 'member-1'
const MEMBER_2 = 'member-2'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    jobs: [{ id: JOB_ID, tenant_id: TENANT_ID, client_id: 'client-1', title: 'Renovation' }],
    team_members: [
      { id: MEMBER_1, tenant_id: TENANT_ID },
      { id: MEMBER_2, tenant_id: TENANT_ID },
    ],
    bookings: [],
    booking_assignees: [],
    booking_team_members: [],
  }
})

describe('POST /api/jobs/[id]/sessions — booking_team_members lead/extras sync', () => {
  it('creates a lead booking_team_members row for a single assignee', async () => {
    const res = await POST(postReq({ start_time: '2026-08-01T09:00:00', assignee_ids: [MEMBER_1] }), params(JOB_ID))
    const json = await res.json()
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === json.session.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ team_member_id: MEMBER_1, is_lead: true, position: 1, tenant_id: TENANT_ID })
  })

  it('creates lead + extra rows for a multi-person crew', async () => {
    const res = await POST(
      postReq({ start_time: '2026-08-01T09:00:00', team_member_id: MEMBER_1, assignee_ids: [MEMBER_1, MEMBER_2] }),
      params(JOB_ID),
    )
    const json = await res.json()
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === json.session.id)
    expect(rows).toHaveLength(2)
    const lead = rows.find((r) => r.is_lead)
    const extra = rows.find((r) => !r.is_lead)
    expect(lead).toMatchObject({ team_member_id: MEMBER_1, position: 1 })
    expect(extra).toMatchObject({ team_member_id: MEMBER_2, position: 2 })
  })

  it('creates no booking_team_members row for an unassigned session', async () => {
    const res = await POST(postReq({ start_time: '2026-08-01T09:00:00' }), params(JOB_ID))
    const json = await res.json()
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === json.session.id)
    expect(rows).toHaveLength(0)
  })
})
