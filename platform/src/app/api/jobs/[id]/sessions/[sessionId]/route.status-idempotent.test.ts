import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] read the session's prior status
 * via a separate SELECT (loadOwnedSession), then compared it against the
 * PATCH body AFTER a separate write to decide whether to log
 * 'session_completed' and call releasePaymentsForEvent. Two concurrent
 * PATCHes marking the same session 'completed' (double-click on the
 * job-session "Mark Complete" action, a client retry, two open tabs) both
 * read the prior status before either write landed and both concluded
 * "this is a real completion" — double-releasing a stage-gated milestone
 * payment and double-logging the timeline event. Same TOCTOU shape already
 * fixed on the job-level PATCH (d4f20506) via an atomic conditional UPDATE
 * (`neq('status', target)` in the WHERE clause); this route gets the same
 * fix. The mock asserts that filter is present so a future refactor can't
 * silently regress back to the read-then-write race.
 */

const sessionsStore = [{ id: 'session-1', tenant_id: 'T', job_id: 'job-1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'in_progress', notes: null as string | null }]

const { logJobEvent, releasePaymentsForEvent } = vi.hoisted(() => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => 0),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent,
  releasePaymentsForEvent,
  shapeSession: (b: unknown) => b,
}))

const neqCalls: Array<{ col: string; val: unknown }> = []

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const matches = (row: (typeof sessionsStore)[number]) =>
      Object.entries(eqs).every(([k, v]) => (row as Record<string, unknown>)[k] === v) &&
      Object.entries(neqs).every(([k, v]) => (row as Record<string, unknown>)[k] !== v)
    const resolve = () => {
      const idx = sessionsStore.findIndex(matches)
      if (idx === -1) return { data: updatePatch ? null : null, error: updatePatch ? null : { message: 'not found' } }
      if (updatePatch) sessionsStore[idx] = { ...sessionsStore[idx], ...updatePatch } as (typeof sessionsStore)[number]
      return { data: sessionsStore[idx], error: null }
    }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        eqs[col] = val
        return chain
      },
      neq: (col: string, val: unknown) => {
        neqs[col] = val
        neqCalls.push({ col, val })
        return chain
      },
      update: (patch: Record<string, unknown>) => {
        updatePatch = patch
        return chain
      },
      maybeSingle: async () => resolve(),
      single: async () => resolve(),
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

const params = { params: Promise.resolve({ id: 'job-1', sessionId: 'session-1' }) }
function req(body: Record<string, unknown>): Request {
  return new Request('https://app.fullloop.example/api/jobs/job-1/sessions/session-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  sessionsStore[0].status = 'in_progress'
  logJobEvent.mockClear()
  releasePaymentsForEvent.mockClear()
  neqCalls.length = 0
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — completion idempotency', () => {
  it('fires session_completed + releasePaymentsForEvent on a real transition to completed', async () => {
    const res = await PATCH(req({ status: 'completed' }), params)
    expect(res.status).toBe(200)
    expect(logJobEvent).toHaveBeenCalledTimes(1)
    expect(logJobEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'session_completed' }))
    expect(releasePaymentsForEvent).toHaveBeenCalledTimes(1)
  })

  it('does NOT re-fire session_completed / release on a same-value re-PATCH (double-click, retry)', async () => {
    sessionsStore[0].status = 'completed'
    const res = await PATCH(req({ status: 'completed' }), params)
    expect(res.status).toBe(200)
    expect(logJobEvent).not.toHaveBeenCalled()
    expect(releasePaymentsForEvent).not.toHaveBeenCalled()
  })

  it('claims the completion transition atomically (neq(status, completed) in the WHERE clause)', async () => {
    await PATCH(req({ status: 'completed' }), params)
    expect(neqCalls).toContainEqual({ col: 'status', val: 'completed' })
  })

  it('still applies non-status fields (notes) when the completion transition is a no-op race loser', async () => {
    sessionsStore[0].status = 'completed'
    const res = await PATCH(req({ status: 'completed', notes: 'Renamed while already complete' }), params)
    expect(res.status).toBe(200)
    expect(sessionsStore[0].notes).toBe('Renamed while already complete')
    expect(logJobEvent).not.toHaveBeenCalled()
    expect(releasePaymentsForEvent).not.toHaveBeenCalled()
  })

  it('does not run the atomic claim for non-completed status transitions', async () => {
    const res = await PATCH(req({ status: 'cancelled' }), params)
    expect(res.status).toBe(200)
    expect(sessionsStore[0].status).toBe('cancelled')
    expect(logJobEvent).not.toHaveBeenCalled()
    expect(releasePaymentsForEvent).not.toHaveBeenCalled()
  })
})
