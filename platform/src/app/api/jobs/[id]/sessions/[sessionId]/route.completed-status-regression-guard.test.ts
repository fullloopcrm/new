import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id]/sessions/[sessionId] writes the same `bookings.status`
 * column that PUT /api/bookings/[id] guards: a completed/paid booking has no
 * downstream reconciliation (payroll team_member_pay, referral commission
 * clawback) anywhere in this codebase, so PUT already blocks flipping one
 * back to 'cancelled'. This route is the *other* door onto the identical
 * column and had no equivalent guard at all — PATCH {status:'cancelled'} on
 * an already-completed session sailed through unconditionally, silently
 * un-completing a session whose completion may have already released a
 * stage-gated payment. Fixed by mirroring PUT's guard here, plus an atomic
 * CAS (`.not('status','in','(completed,paid)')`) on the write itself to
 * close the race window between the read and the write.
 */

const sessionsStore = [
  { id: 'session-completed', tenant_id: 'T', job_id: 'job-1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'completed', notes: null as string | null },
  { id: 'session-paid', tenant_id: 'T', job_id: 'job-1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'paid', notes: null as string | null },
  { id: 'session-open', tenant_id: 'T', job_id: 'job-1', start_time: '2026-08-01T10:00:00Z', end_time: '2026-08-01T12:00:00Z', status: 'in_progress', notes: null as string | null },
]

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => 0),
  shapeSession: (b: unknown) => b,
}))

vi.mock('@/lib/supabase', () => {
  function from(_table: string) {
    const eqs: Record<string, unknown> = {}
    const notIns: Array<{ col: string; vals: string[] }> = []
    let updatePatch: Record<string, unknown> | null = null
    const matches = (row: (typeof sessionsStore)[number]) =>
      Object.entries(eqs).every(([k, v]) => (row as Record<string, unknown>)[k] === v) &&
      notIns.every(({ col, vals }) => !vals.includes(String((row as Record<string, unknown>)[col])))
    const resolveOne = () => {
      const idx = sessionsStore.findIndex(matches)
      return { data: idx === -1 ? null : sessionsStore[idx], error: idx === -1 ? { message: 'not found' } : null }
    }
    const resolveList = () => {
      const idx = sessionsStore.findIndex(matches)
      if (idx === -1) return { data: [], error: null }
      if (updatePatch) sessionsStore[idx] = { ...sessionsStore[idx], ...updatePatch } as (typeof sessionsStore)[number]
      return { data: [sessionsStore[idx]], error: null }
    }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      neq: (col: string, val: unknown) => { notIns.push({ col, vals: [String(val)] }); return chain },
      not: (col: string, op: string, val: string) => {
        if (op === 'in') notIns.push({ col, vals: val.replace(/^\(|\)$/g, '').split(',') })
        return chain
      },
      update: (patch: Record<string, unknown>) => { updatePatch = patch; return chain },
      maybeSingle: async () => resolveOne(),
      single: async () => resolveOne(),
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(updatePatch ? resolveList() : resolveOne()).then(onFulfilled, onRejected),
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://app.fullloop.example/api/jobs/job-1/sessions/x', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
const params = (sessionId: string) => ({ params: Promise.resolve({ id: 'job-1', sessionId }) })

beforeEach(() => {
  sessionsStore[0].status = 'completed'
  sessionsStore[0].notes = null
  sessionsStore[1].status = 'paid'
  sessionsStore[2].status = 'in_progress'
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — completed/paid status-regression guard', () => {
  it('blocks flipping a completed session back to cancelled', async () => {
    const res = await PATCH(req({ status: 'cancelled' }), params('session-completed'))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/completed/i)
    expect(sessionsStore[0].status).toBe('completed')
  })

  it('blocks flipping a paid session back to pending', async () => {
    const res = await PATCH(req({ status: 'pending' }), params('session-paid'))
    expect(res.status).toBe(400)
    expect(sessionsStore[1].status).toBe('paid')
  })

  it('still allows non-status edits (notes) on a completed session', async () => {
    const res = await PATCH(req({ notes: 'client called with feedback' }), params('session-completed'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.session.notes).toBe('client called with feedback')
  })

  it('allows an open session to move to cancelled normally', async () => {
    const res = await PATCH(req({ status: 'cancelled' }), params('session-open'))
    expect(res.status).toBe(200)
    expect(sessionsStore[2].status).toBe('cancelled')
  })

  it('still allows re-confirming completed on an already-completed session (idempotent)', async () => {
    const res = await PATCH(req({ status: 'completed' }), params('session-completed'))
    expect(res.status).toBe(200)
    expect(sessionsStore[0].status).toBe('completed')
  })
})
