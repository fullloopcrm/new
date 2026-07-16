import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id] fired the 'completed' timeline event, attempted a
 * payment release, and sent the owner "Job complete" SMS/email on every
 * status PATCH — even when the status was already 'completed'. A double-click
 * on "Mark Complete", a client retry, or a stale tab resubmitting the same
 * PATCH re-sent the owner alert every time. Fixed by reading the prior status
 * before the write and only firing side effects on an actual transition.
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

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    let updatePatch: Record<string, unknown> | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        eqs[col] = val
        return chain
      },
      update: (patch: Record<string, unknown>) => {
        updatePatch = patch
        return chain
      },
      maybeSingle: async () => {
        const row = jobsStore.find((r) => r.id === eqs.id && r.tenant_id === eqs.tenant_id)
        return { data: row ? { status: row.status } : null, error: null }
      },
      single: async () => {
        const idx = jobsStore.findIndex((r) => r.id === eqs.id && r.tenant_id === eqs.tenant_id)
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
})
