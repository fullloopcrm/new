import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/referrals/:id — mass-assignment / cross-tenant regression.
 *
 * The route spread the raw request body straight into `.update(body)`. Since
 * this table (like every tenant-owned table) has its own `tenant_id` column
 * and the write goes through the service_role client (RLS bypassed), a caller
 * with `referrals.payout` permission on their own tenant could include
 * `tenant_id` in the PUT body to reassign someone else's referral row (e.g. to
 * hide a payout obligation, or pollute another tenant's data), even though the
 * WHERE clause still requires the row to currently belong to the caller's tenant.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const t = vi.hoisted(() => ({ requirePermission: vi.fn(), tenantId: 'tenant-A' }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => t.requirePermission(...a),
}))

import { PUT } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  t.tenantId = 'tenant-A'
  t.requirePermission.mockReset()
  t.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: t.tenantId }, error: null }))
  h.seq = 0
  h.store = {
    referrals: [
      { id: 'ref-A1', tenant_id: 'tenant-A', amount: 5000, status: 'pending' },
      { id: 'ref-B1', tenant_id: 'tenant-B', amount: 3000, status: 'pending' },
    ],
  }
})

describe('PUT /api/referrals/:id', () => {
  it('updates an ordinary field on the caller tenant’s own referral', async () => {
    const res = await PUT(putReq({ status: 'paid' }), params('ref-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral.status).toBe('paid')
  })

  it('ignores a tenant_id in the body instead of reassigning the referral to another tenant', async () => {
    const res = await PUT(putReq({ status: 'paid', tenant_id: 'tenant-B' }), params('ref-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral.tenant_id).toBe('tenant-A')
    expect(h.store.referrals.find((r) => r.id === 'ref-A1')?.tenant_id).toBe('tenant-A')
  })

  it("tenant A can never update tenant B's referral", async () => {
    const res = await PUT(putReq({ status: 'hacked' }), params('ref-B1'))

    expect(res.status).toBe(500)
    expect(h.store.referrals.find((r) => r.id === 'ref-B1')?.status).toBe('pending')
  })

  // referrer_client_id is a caller-supplied FK with no cross-tenant check at
  // the DB layer. GET /api/referrals joins clients!referrals_referrer_client_id_fkey(name)
  // off it, unscoped by tenant — repointing a referral's referrer_client_id
  // would leak a foreign tenant's client name on the next fetch. Now stripped
  // by the allow-list.
  it('ignores a referrer_client_id in the body instead of repointing the referral at a foreign client', async () => {
    const res = await PUT(putReq({ status: 'paid', referrer_client_id: 'foreign-client' }), params('ref-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral.referrer_client_id).toBeUndefined()
    expect(h.store.referrals.find((r) => r.id === 'ref-A1')?.referrer_client_id).toBeUndefined()
  })
})
