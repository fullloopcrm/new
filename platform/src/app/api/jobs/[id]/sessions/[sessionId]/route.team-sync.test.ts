/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] -- booking_team_members
 * lead/extras-sync gap on reassignment.
 *
 * Reassigning a session replaced booking_assignees (its own Jobs-UI display
 * join) and bookings.team_member_id (the lead), but never touched
 * booking_team_members -- the table GET /api/bookings/:id/team and
 * closeout-summary actually source the multi-tech team from. A reassign here
 * left the OLD lead/extras (or nothing at all, on the first-ever assignment)
 * stuck in booking_team_members, so the Team panel and closeout payout
 * attribution silently kept crediting whoever was assigned before, or just
 * the sole lead. Same booking_team_members-sync gap fixed at every other
 * bookings.team_member_id write site this session.
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
  return { ...actual, logJobEvent: vi.fn(async () => {}), releasePaymentsForEvent: vi.fn(async () => 0) }
})

import { PATCH } from './route'

const TENANT_ID = 'tenant-A'
const JOB_ID = 'job-1'
const SESSION_ID = 'book-1'
const MEMBER_1 = 'member-1'
const MEMBER_2 = 'member-2'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string, sessionId: string) => ({ params: Promise.resolve({ id, sessionId }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    bookings: [
      { id: SESSION_ID, tenant_id: TENANT_ID, job_id: JOB_ID, status: 'confirmed', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T11:00:00' },
    ],
    team_members: [
      { id: MEMBER_1, tenant_id: TENANT_ID },
      { id: MEMBER_2, tenant_id: TENANT_ID },
    ],
    booking_assignees: [],
    booking_team_members: [],
  }
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — booking_team_members lead/extras sync', () => {
  it('creates a lead row on the first-ever assignment (previously created nothing)', async () => {
    const res = await PATCH(patchReq({ assignee_ids: [MEMBER_1] }), params(JOB_ID, SESSION_ID))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === SESSION_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ team_member_id: MEMBER_1, is_lead: true, position: 1, tenant_id: TENANT_ID })
  })

  it('replaces the stale lead/extras set on reassignment rather than leaving the old one', async () => {
    h.store.booking_team_members = [
      { id: 'btm-old', tenant_id: TENANT_ID, booking_id: SESSION_ID, team_member_id: MEMBER_1, is_lead: true, position: 1 },
    ]

    const res = await PATCH(patchReq({ team_member_id: MEMBER_2, assignee_ids: [MEMBER_2] }), params(JOB_ID, SESSION_ID))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === SESSION_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ team_member_id: MEMBER_2, is_lead: true })
  })

  it('clears booking_team_members when reassigned to nobody', async () => {
    h.store.booking_team_members = [
      { id: 'btm-old', tenant_id: TENANT_ID, booking_id: SESSION_ID, team_member_id: MEMBER_1, is_lead: true, position: 1 },
    ]

    const res = await PATCH(patchReq({ assignee_ids: [] }), params(JOB_ID, SESSION_ID))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === SESSION_ID)
    expect(rows).toHaveLength(0)
  })

  it('leaves booking_team_members untouched when the PATCH does not reassign', async () => {
    h.store.booking_team_members = [
      { id: 'btm-old', tenant_id: TENANT_ID, booking_id: SESSION_ID, team_member_id: MEMBER_1, is_lead: true, position: 1 },
    ]

    const res = await PATCH(patchReq({ notes: 'updated notes' }), params(JOB_ID, SESSION_ID))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === SESSION_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0].team_member_id).toBe(MEMBER_1)
  })
})
