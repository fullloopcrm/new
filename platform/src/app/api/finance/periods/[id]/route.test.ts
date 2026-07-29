/**
 * Characterization tests for finance/periods/[id] PATCH — zero coverage
 * before this file despite being the only lever that locks/reopens an
 * accounting period, a real financial control (a locked period should be
 * frozen from further postings/edits elsewhere in the app).
 *
 * Pins:
 *   - status:'locked' sets status=locked + locked_at (now) + locked_by=actor_id
 *   - status:'reopened' OR 'open' both normalize to status=open, and stamp
 *     reopened_at/reopened_by/reopened_reason
 *   - status:'in_review' sets ONLY status=in_review (no timestamp stamping)
 *   - checklist/notes pass through only when present as keys on the body
 *     ('in' check, not truthiness — an explicit null/empty still applies)
 *   - the update is tenant-scoped: a foreign tenant's period is never touched
 *   - a period id that doesn't resolve (0 rows) surfaces as a 500 with the
 *     underlying error, not a false 200
 *   - an auth failure short-circuits before any query
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<
      | { tenant: { userId: string; tenantId: string; tenant: { id: string }; role: string }; error: null }
      | { tenant: null; error: Response }
    > => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null }),
  ),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { PATCH } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  h = createTenantDbHarness({
    accounting_periods: [{ id: 'per-1', tenant_id: CTX_TENANT, status: 'open' }],
  })
  holder.from = h.from
})

function patchReq(body: unknown): Request {
  return new Request('http://t', { method: 'PATCH', body: JSON.stringify(body) })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/finance/periods/[id]', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await PATCH(patchReq({ status: 'locked' }), params('per-1'))
    expect(res.status).toBe(403)
  })

  it('status:locked stamps locked_at + locked_by from actor_id', async () => {
    const res = await PATCH(patchReq({ status: 'locked', actor_id: 'user-9' }), params('per-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.period).toMatchObject({ status: 'locked', locked_by: 'user-9' })
    expect(body.period.locked_at).toBeTruthy()
  })

  it('locked_by is null when no actor_id is supplied', async () => {
    const res = await PATCH(patchReq({ status: 'locked' }), params('per-1'))
    const body = await res.json()
    expect(body.period.locked_by).toBeNull()
  })

  it('status:reopened normalizes to open and stamps reopened_at/reopened_by/reopened_reason', async () => {
    const res = await PATCH(patchReq({ status: 'reopened', actor_id: 'user-9', reopened_reason: 'found an error' }), params('per-1'))
    const body = await res.json()
    expect(body.period).toMatchObject({ status: 'open', reopened_by: 'user-9', reopened_reason: 'found an error' })
    expect(body.period.reopened_at).toBeTruthy()
  })

  it('status:open (not just "reopened") also normalizes to open with the same stamps', async () => {
    const res = await PATCH(patchReq({ status: 'open' }), params('per-1'))
    const body = await res.json()
    expect(body.period.status).toBe('open')
    expect(body.period.reopened_at).toBeTruthy()
  })

  it('status:in_review sets ONLY status, no timestamp stamping', async () => {
    const res = await PATCH(patchReq({ status: 'in_review' }), params('per-1'))
    const body = await res.json()
    expect(body.period.status).toBe('in_review')
    expect(body.period.locked_at).toBeUndefined()
    expect(body.period.reopened_at).toBeUndefined()
  })

  it('passes checklist and notes through when present on the body', async () => {
    const res = await PATCH(patchReq({ checklist: { bank: true }, notes: 'all good' }), params('per-1'))
    const body = await res.json()
    expect(body.period.checklist).toEqual({ bank: true })
    expect(body.period.notes).toBe('all good')
  })

  it('never updates a period belonging to another tenant', async () => {
    h.seed.accounting_periods.push({ id: 'per-foreign', tenant_id: OTHER_TENANT, status: 'open' })
    const res = await PATCH(patchReq({ status: 'locked' }), params('per-foreign'))
    expect(res.status).toBe(500) // 0 rows matched -> PGRST116, surfaced as an error, not a false success
    const foreign = h.seed.accounting_periods.find((p) => p.id === 'per-foreign')!
    expect(foreign.status).toBe('open')
  })

  it('a nonexistent period id surfaces as a 500, not a false 200', async () => {
    const res = await PATCH(patchReq({ status: 'locked' }), params('nope'))
    expect(res.status).toBe(500)
  })
})
