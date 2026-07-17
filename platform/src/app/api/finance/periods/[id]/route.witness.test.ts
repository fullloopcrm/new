/**
 * PATCH /api/finance/periods/[id] — locked_by/reopened_by actor_id trust.
 *
 * These are UUID columns with no FK constraint. The route used to write
 * `body.actor_id` into them verbatim — any finance.expenses holder could
 * forge who "locked" or "reopened" a period, a compliance control that
 * gates whether journal entries can post for that month. The columns also
 * never got a legitimate value in real use: the close-page UI never sent
 * actor_id at all, and the caller's real userId (which IS trustworthy) can
 * be 'admin' or a Clerk id, neither of which fits UUID. Fixed by dropping
 * client-supplied actor_id entirely — real attribution now comes from the
 * audit_row_changes trigger (2026_07_17_accounting_periods_audit_trigger_PROPOSED.sql).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A } = vi.hoisted(() => ({ TENANT_A: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    accounting_periods: [
      { id: 'per-1', tenant_id: TENANT_A, year: 2026, month: 6, status: 'open', checklist: {}, locked_by: null, reopened_by: null },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = Promise.resolve({ id: 'per-1' })

describe('PATCH /api/finance/periods/[id] — actor_id forgery guard', () => {
  it('LOCK: a forged actor_id in the body is never written to locked_by', async () => {
    const forgedUuid = '11111111-1111-1111-1111-111111111111'
    const res = await PATCH(patchReq({ status: 'locked', actor_id: forgedUuid }), { params })
    expect(res.status).toBe(200)
    const row = fake._all('accounting_periods').find(r => r.id === 'per-1')
    expect(row?.locked_by).not.toBe(forgedUuid)
    expect(row?.locked_by).toBeNull()
    expect(row?.status).toBe('locked')
  })

  it('REOPEN: a forged actor_id in the body is never written to reopened_by', async () => {
    const forgedUuid = '22222222-2222-2222-2222-222222222222'
    const res = await PATCH(patchReq({ status: 'reopened', actor_id: forgedUuid, reopened_reason: 'test' }), { params })
    expect(res.status).toBe(200)
    const row = fake._all('accounting_periods').find(r => r.id === 'per-1')
    expect(row?.reopened_by).not.toBe(forgedUuid)
    expect(row?.reopened_by).toBeNull()
    expect(row?.status).toBe('open')
  })
})
