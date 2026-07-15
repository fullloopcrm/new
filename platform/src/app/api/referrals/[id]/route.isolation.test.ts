import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * referrals/[id] PUT — mass-assignment regression test.
 *
 * BUG (fixed here): the route spread the ENTIRE request body into
 * `referrals.update(body)` with no column allow-list — the caller controlled
 * every column on their own row, including `tenant_id` (row donation) and
 * `referrer_client_id`/`referred_client_id` (cross-tenant FK injection).
 *
 * FIX: only status/reward_amount are now assignable; tenant_id and the FK
 * columns are dropped even if present in the body.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { PUT } from './route'

function seed() {
  return {
    referrals: [
      { id: 'ref-a', tenant_id: CTX_TENANT, referrer_client_id: 'c-a', referred_client_id: 'c-a2', status: 'pending', reward_amount: 0 },
    ],
  }
}

function putReq(body: unknown): Request {
  return { url: 'http://t/api/referrals/ref-a', json: async () => body } as unknown as Request
}
function ctx() {
  return { params: Promise.resolve({ id: 'ref-a' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('referrals/[id] PUT — mass-assignment guard', () => {
  it('drops tenant_id from the body — the row is never donated to another tenant', async () => {
    const res = await PUT(putReq({ status: 'paid', tenant_id: OTHER_TENANT }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'referrals')
    expect(upd!.values.tenant_id).toBeUndefined()
    const row = h.seed.referrals.find((r) => r.id === 'ref-a')!
    expect(row.tenant_id).toBe(CTX_TENANT)
  })

  it('drops referrer_client_id/referred_client_id FK columns from the body', async () => {
    const res = await PUT(putReq({ referrer_client_id: 'c-b', referred_client_id: 'c-b2' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'referrals')
    expect(upd!.values.referrer_client_id).toBeUndefined()
    expect(upd!.values.referred_client_id).toBeUndefined()
  })

  it('allow-listed fields still update normally', async () => {
    const res = await PUT(putReq({ status: 'paid', reward_amount: 2500 }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'referrals')
    expect(upd!.values.status).toBe('paid')
    expect(upd!.values.reward_amount).toBe(2500)
  })
})
