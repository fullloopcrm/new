import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id] fired the 'completed' timeline event, attempted a
 * payment release, and sent the owner "Job complete" SMS/email on every
 * status PATCH — even when the status was already 'completed'. A double-click
 * on "Mark Complete", a client retry, or a stale tab resubmitting the same
 * PATCH re-sent the owner alert every time. The original fix read the prior
 * status before a separate write — that closes the sequential re-PATCH case
 * (tested below) but not two truly concurrent PATCHes, which could both read
 * the stale prior status before either write landed. Fixed for real with an
 * atomic conditional UPDATE (`neq('status', target)` in the WHERE clause) —
 * only the request that actually flips the status can match a row; the mock
 * below asserts that filter is present so a future refactor can't silently
 * regress back to the read-then-write race.
 */

const jobsStore = [{ id: 'job-1', tenant_id: 'T', title: 'Dumpster drop — 12 Elm St', status: 'in_progress', total_cents: 45000 }]

const { logJobEvent, releasePaymentsForEvent, ownerAlert } = vi.hoisted(() => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => 0),
  ownerAlert: vi.fn(async () => {}),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: 'T', tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent,
  releasePaymentsForEvent,
  shapeSession: (b: unknown) => b,
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))

const neqCalls: Array<{ col: string; val: unknown }> = []

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    const neqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const matches = (row: (typeof jobsStore)[number]) =>
      Object.entries(eqs).every(([k, v]) => (row as Record<string, unknown>)[k] === v) &&
      Object.entries(neqs).every(([k, v]) => (row as Record<string, unknown>)[k] !== v)
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
      maybeSingle: async () => {
        const idx = jobsStore.findIndex(matches)
        if (idx === -1) return { data: null, error: null }
        if (updatePatch) {
          jobsStore[idx] = { ...jobsStore[idx], ...updatePatch } as (typeof jobsStore)[number]
        }
        return { data: jobsStore[idx], error: null }
      },
      single: async () => {
        const idx = jobsStore.findIndex(matches)
        if (idx === -1) return { data: null, error: { message: 'not found' } }
        if (updatePatch) {
          jobsStore[idx] = { ...jobsStore[idx], ...updatePatch } as (typeof jobsStore)[number]
        }
        return { data: jobsStore[idx], error: null }
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

const params = { params: Promise.resolve({ id: 'job-1' }) }
function req(status: string) {
  return new Request('https://app.fullloop.example/api/jobs/job-1', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

beforeEach(() => {
  jobsStore[0].status = 'in_progress'
  logJobEvent.mockClear()
  releasePaymentsForEvent.mockClear()
  ownerAlert.mockClear()
  neqCalls.length = 0
})

describe('PATCH /api/jobs/[id] — status transition idempotency', () => {
  it('fires the completion event, payment release, and owner alert on a real transition', async () => {
    const res = await PATCH(req('completed'), params)
    expect(res.status).toBe(200)
    expect(logJobEvent).toHaveBeenCalledTimes(1)
    expect(releasePaymentsForEvent).toHaveBeenCalledTimes(1)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
  })

  it('does NOT re-fire the owner alert / event / payment release on a same-value re-PATCH (double-click, retry)', async () => {
    jobsStore[0].status = 'completed'
    const res = await PATCH(req('completed'), params)
    expect(res.status).toBe(200)
    expect(logJobEvent).not.toHaveBeenCalled()
    expect(releasePaymentsForEvent).not.toHaveBeenCalled()
    expect(ownerAlert).not.toHaveBeenCalled()
  })

  it('claims the status transition atomically (neq(status, target) in the WHERE clause)', async () => {
    await PATCH(req('completed'), params)
    expect(neqCalls).toContainEqual({ col: 'status', val: 'completed' })
  })

  it('still applies non-status fields (title) when the status transition is a no-op race loser', async () => {
    jobsStore[0].status = 'completed'
    const res = await PATCH(
      new Request('https://app.fullloop.example/api/jobs/job-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', title: 'Renamed while already complete' }),
      }),
      params,
    )
    expect(res.status).toBe(200)
    expect(jobsStore[0].title).toBe('Renamed while already complete')
    expect(logJobEvent).not.toHaveBeenCalled()
    expect(ownerAlert).not.toHaveBeenCalled()
  })
})
