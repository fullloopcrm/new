/**
 * POST /api/jobs/[id]/sessions -- the booking_assignees batch insert's error
 * was previously discarded entirely (`await supabaseAdmin.from('booking_assignees')
 * .insert(...)`, return value never read). booking_assignees' own
 * PRIMARY KEY (booking_id, team_member_id) (2026_07_03_booking_assignees.sql)
 * can raise on that insert, which would silently leave the freshly-created
 * booking with ZERO assignee rows while this route still returned
 * `assignees: assigneeList` -- the INTENDED set, not what actually landed.
 * Same class as POST /api/schedules' discarded bookings-batch-insert bug:
 * this route now surfaces the error instead of swallowing it.
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
  h.failAssigneeInsert = false
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
  }
})

describe('POST /api/jobs/[id]/sessions -- booking_assignees insert error is surfaced, not swallowed', () => {
  it('returns 500 instead of a false success when the assignee insert fails', async () => {
    h.failAssigneeInsert = true

    const res = await POST(
      postReq({ start_time: '2026-08-01T09:00:00', assignee_ids: [MEMBER_1, MEMBER_2] }),
      params(JOB_ID),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toContain('booking_assignees_pkey')
    // The bug: this used to be 200 with assignees:[MEMBER_1, MEMBER_2] even
    // though zero booking_assignees rows actually landed.
    expect(json.assignees).toBeUndefined()
    // The booking itself was created and is still surfaced for follow-up.
    expect(json.session?.id).toBeDefined()
    expect(h.store.booking_assignees.length).toBe(0)
  })

  it('regression control: a clean assignee insert still returns 200 with the real assignee set', async () => {
    const res = await POST(
      postReq({ start_time: '2026-08-01T09:00:00', assignee_ids: [MEMBER_1, MEMBER_2] }),
      params(JOB_ID),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.assignees.sort()).toEqual([MEMBER_1, MEMBER_2].sort())
    expect(h.store.booking_assignees.length).toBe(2)
  })
})
