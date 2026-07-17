import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/team-applications applied `{ status: 'approved' }` with no check
 * that the row wasn't already approved, then unconditionally re-ran
 * provisionApprovedApplicant() -- which re-sends the applicant their
 * "you're approved, here's your PIN" email. A double-click on the approve
 * button (no client-side disable/loading guard) or a retried PUT re-sent the
 * email every time. Same double-fire class as campaign-send / rating-prompt-
 * cron / bookings-PUT-notify fixed earlier this session. Fixed with an
 * atomic claim (`.neq('status', 'approved')`) so only the call that actually
 * flips the row into 'approved' provisions/emails.
 */

const TENANT = 't-1'
const APP_ID = 'app-1'

const { provisionSpy } = vi.hoisted(() => ({ provisionSpy: vi.fn(async () => {}) }))
vi.mock('@/lib/team-provisioning', () => ({ provisionApprovedApplicant: provisionSpy }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({ AuthError: class AuthError extends Error { status = 401 } }))

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    const neqs: Row = {}
    let updatePayload: Row | null = null
    const match = (r: Row) =>
      Object.entries(eqs).every(([k, v]) => r[k] === v) &&
      Object.entries(neqs).every(([k, v]) => r[k] !== v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { updatePayload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      neq: (col: string, val: unknown) => { neqs[col] = val; return c },
      maybeSingle: async () => {
        const rows = (store[table] || []).filter(match)
        if (updatePayload) {
          const target = rows[0]
          if (!target) return { data: null, error: null }
          Object.assign(target, updatePayload)
          return { data: { ...target }, error: null }
        }
        return { data: rows[0] || null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { PUT } from '@/app/api/team-applications/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/team-applications', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/team-applications — approval double-fire guard', () => {
  beforeEach(() => {
    store.team_applications = [
      { id: APP_ID, tenant_id: TENANT, name: 'Applicant One', email: 'a@x.com', phone: '5551234567', status: 'pending' },
    ]
    provisionSpy.mockClear()
  })

  it('provisions/emails on the first approve', async () => {
    const res = await PUT(jsonReq({ id: APP_ID, status: 'approved' }))
    expect(res.status).toBe(200)
    expect(provisionSpy).toHaveBeenCalledTimes(1)
    expect(store.team_applications[0].status).toBe('approved')
  })

  it('does not re-provision/re-email on a second approve for an already-approved application', async () => {
    await PUT(jsonReq({ id: APP_ID, status: 'approved' }))
    provisionSpy.mockClear()

    const res = await PUT(jsonReq({ id: APP_ID, status: 'approved' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.application.status).toBe('approved')
    expect(provisionSpy).not.toHaveBeenCalled()
  })

  it('still applies a non-approval status change (rejected) with no provisioning', async () => {
    const res = await PUT(jsonReq({ id: APP_ID, status: 'rejected' }))
    expect(res.status).toBe(200)
    expect(store.team_applications[0].status).toBe('rejected')
    expect(provisionSpy).not.toHaveBeenCalled()
  })
})
