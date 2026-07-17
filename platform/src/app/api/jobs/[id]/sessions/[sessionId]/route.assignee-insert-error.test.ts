/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] -- reassignment deletes the
 * prior booking_assignees rows then re-inserts the new set; the re-insert's
 * error was previously discarded entirely. booking_assignees' own
 * PRIMARY KEY (booking_id, team_member_id) (2026_07_03_booking_assignees.sql)
 * can raise on that insert (e.g. a duplicate id resolved twice into the new
 * set), which -- AFTER the delete already cleared the prior assignees --
 * would leave the booking with ZERO assignees, no error surfaced, and
 * `session_reassigned` logged with the intended count instead of what
 * actually landed. Same silent-write-failure class as POST /api/schedules
 * and this route's sibling POST /api/jobs/[id]/sessions: surfaced instead.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  failAssigneeInsert: false,
}))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table === 'booking_assignees') {
        const origInsert = (chain.insert as (p: unknown) => unknown).bind(chain)
        chain.insert = (payload: unknown) => {
          if (h.failAssigneeInsert) {
            return Promise.resolve({
              data: null,
              error: { message: 'duplicate key value violates unique constraint "booking_assignees_pkey"' },
            })
          }
          return origInsert(payload)
        }
      }
      return chain
    },
  }
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
  h.failAssigneeInsert = false
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
    booking_assignees: [{ booking_id: SESSION_ID, team_member_id: MEMBER_1 }],
  }
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] -- booking_assignees re-insert error is surfaced, not swallowed', () => {
  it('returns 500 (not a silently-emptied 200) when the post-delete re-insert fails, leaving the caller informed', async () => {
    h.failAssigneeInsert = true

    const res = await PATCH(patchReq({ assignee_ids: [MEMBER_2] }), params(JOB_ID, SESSION_ID))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/Reassignment failed/i)
    // The bug: this used to be 200 with an accurate-but-unexplained empty
    // assignee list -- the delete had already cleared MEMBER_1's row and the
    // failed insert never replaced it, with nothing telling the caller why.
    expect(h.store.booking_assignees.length).toBe(0)
  })

  it('regression control: a clean reassignment still returns 200 with the new assignee set persisted', async () => {
    const res = await PATCH(patchReq({ assignee_ids: [MEMBER_2] }), params(JOB_ID, SESSION_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(h.store.booking_assignees).toHaveLength(1)
    expect(h.store.booking_assignees[0]).toMatchObject({ booking_id: SESSION_ID, team_member_id: MEMBER_2 })
    expect(json.session).toBeDefined()
  })
})
