import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] let a move (start_time/end_time)
 * or reassign (team_member_id/assignee_ids/crew_id) silently double-book a
 * team member — no conflict check at all, unlike POST /api/bookings. Fixed
 * to run the same findSchedulingConflicts guard whenever the effective
 * (team_member, time-window) pair for the patched session changes, excluding
 * the session's own row from its own conflict check.
 */

const sessionsStore = [
  { id: 'session-1', tenant_id: 'T', job_id: 'job-1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'confirmed', notes: null as string | null, team_member_id: 'tm-1' },
]

const { findSchedulingConflicts } = vi.hoisted(() => ({
  findSchedulingConflicts: vi.fn(async () => [] as { id: string; start: string | null; end: string | null }[]),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent: async () => {},
  releasePaymentsForEvent: async () => 0,
  shapeSession: (b: unknown) => b,
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ booking_buffer_minutes: 30 }),
}))
vi.mock('@/lib/schedule/conflict-check', () => ({ findSchedulingConflicts }))

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const matches = (row: (typeof sessionsStore)[number]) =>
      Object.entries(eqs).every(([k, v]) => (row as Record<string, unknown>)[k] === v)
    const resolve = () => {
      const idx = sessionsStore.findIndex(matches)
      if (idx === -1) return { data: null, error: { message: 'not found' } }
      if (updatePatch) sessionsStore[idx] = { ...sessionsStore[idx], ...updatePatch } as (typeof sessionsStore)[number]
      return { data: sessionsStore[idx], error: null }
    }
    let inIds: string[] | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        eqs[col] = val
        return chain
      },
      neq: () => chain,
      in: (_col: string, vals: string[]) => {
        inIds = vals
        return chain
      },
      update: (patch: Record<string, unknown>) => {
        updatePatch = patch
        return chain
      },
      delete: () => chain,
      insert: () => chain,
      maybeSingle: async () => resolve(),
      single: async () => resolve(),
      then: (onFulfilled: (v: unknown) => unknown) => {
        if (table === 'team_members' && inIds) {
          return Promise.resolve({ data: inIds.map((id) => ({ id })), error: null }).then(onFulfilled)
        }
        return Promise.resolve(resolve()).then(onFulfilled)
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

const params = { params: Promise.resolve({ id: 'job-1', sessionId: 'session-1' }) }
function req(body: Record<string, unknown>): Request {
  return new Request('https://app.fullloop.example/api/jobs/job-1/sessions/session-1', { method: 'PATCH', body: JSON.stringify(body) })
}

beforeEach(() => {
  sessionsStore[0].start_time = '2026-08-01T10:00:00Z'
  sessionsStore[0].end_time = '2026-08-01T12:00:00Z'
  sessionsStore[0].team_member_id = 'tm-1'
  sessionsStore[0].notes = null
  findSchedulingConflicts.mockReset()
  findSchedulingConflicts.mockResolvedValue([])
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — double-booking guard', () => {
  it('applies a reschedule when the moved-to slot has no conflict, excluding its own row', async () => {
    const res = await PATCH(req({ start_time: '2026-08-01T14:00:00Z' }), params)
    expect(res.status).toBe(200)
    expect(findSchedulingConflicts).toHaveBeenCalledWith('T', 'tm-1', expect.any(String), expect.any(String), 30, 'session-1')
    expect(sessionsStore[0].start_time).toBe('2026-08-01T14:00:00.000Z')
  })

  it('rejects a reschedule with 409 when the new slot conflicts, and does not move the session', async () => {
    findSchedulingConflicts.mockResolvedValue([{ id: 'other', start: '2026-08-01T13:00:00Z', end: '2026-08-01T15:00:00Z' }])
    const res = await PATCH(req({ start_time: '2026-08-01T14:00:00Z' }), params)
    expect(res.status).toBe(409)
    expect(sessionsStore[0].start_time).toBe('2026-08-01T10:00:00Z')
  })

  it('checks the conflict against the newly-assigned member on a reassign, not the prior one', async () => {
    const res = await PATCH(req({ team_member_id: 'tm-2' }), params)
    expect(res.status).toBe(200)
    expect(findSchedulingConflicts).toHaveBeenCalledWith('T', 'tm-2', expect.any(String), expect.any(String), 30, 'session-1')
  })

  it('does not run the conflict check for a plain notes edit (no move or reassign)', async () => {
    const res = await PATCH(req({ notes: 'just a note' }), params)
    expect(res.status).toBe(200)
    expect(findSchedulingConflicts).not.toHaveBeenCalled()
  })
})
