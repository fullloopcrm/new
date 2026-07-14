/**
 * PUT /api/referrals/:id — mass-assignment / tenant-donation regression.
 *
 * The route used to spread the raw request body straight into `.update(body)`,
 * scoped only by `.eq('id', id).eq('tenant_id', tenantId)` on the WHERE side.
 * Nothing stopped the SET clause from including `tenant_id` (or any other
 * column) — a caller with `referrals.payout` permission on their own tenant
 * could reassign one of their own referral rows into a different tenant's
 * namespace. Fixed by allow-listing the editable fields via `pick()` and
 * switching to `tenantDb()`, whose `update()` also strips `tenant_id` from the
 * payload as defense in depth.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    referrals: [
      { id: 'ref-A1', tenant_id: TENANT_A, status: 'pending', commission_rate: 0.1 },
      { id: 'ref-B1', tenant_id: TENANT_B, status: 'pending', commission_rate: 0.1 },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('PUT /api/referrals/:id — mass-assignment guard', () => {
  it('updates an allow-listed field on the caller tenant’s own referral', async () => {
    const res = await PUT(putReq({ status: 'paid' }), params('ref-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral.status).toBe('paid')
  })

  it('drops a tenant_id in the body instead of donating the referral to another tenant', async () => {
    const res = await PUT(putReq({ status: 'paid', tenant_id: TENANT_B }), params('ref-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referral.tenant_id).toBe(TENANT_A)
    expect(fake._all('referrals').find((r) => r.id === 'ref-A1')?.tenant_id).toBe(TENANT_A)
  })

  it('cannot touch a different tenant’s referral row at all', async () => {
    const res = await PUT(putReq({ status: 'hacked' }), params('ref-B1'))

    expect(res.status).toBe(500)
    expect(fake._all('referrals').find((r) => r.id === 'ref-B1')?.status).toBe('pending')
  })
})
