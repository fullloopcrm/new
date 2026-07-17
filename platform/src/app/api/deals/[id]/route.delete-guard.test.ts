/**
 * DELETE /api/deals/:id — sold/converted-deal delete guard.
 *
 * The route used to hard-delete unconditionally. deal_activities carries a
 * NOT NULL ON DELETE CASCADE to deals (migration 011), so deleting a deal
 * silently wiped its entire activity/audit trail, including the stage-
 * change log entry written when a deal closes 'sold' and the deposit-paid
 * note the Stripe webhook writes. Fixed by blocking delete when the deal is
 * Sold or has a linked quote with real accept/deposit/conversion history
 * (checkDealDeletable).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    deals: [
      { id: 'deal-lead', tenant_id: TENANT_A, title: 'Cold lead', stage: 'lead' },
      { id: 'deal-sold', tenant_id: TENANT_A, title: 'Closed deal', stage: 'sold' },
      { id: 'deal-converted-quote', tenant_id: TENANT_A, title: 'Quoted deal', stage: 'quoted' },
      { id: 'deal-B1', tenant_id: TENANT_B, title: 'Other tenant lead', stage: 'lead' },
    ],
    quotes: [
      { id: 'q-1', tenant_id: TENANT_A, deal_id: 'deal-converted-quote', status: 'accepted', deposit_paid_at: null, converted_job_id: null },
    ],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const delReq = () => new Request('http://x', { method: 'DELETE' })

describe('DELETE /api/deals/:id — sold/converted-deal delete guard', () => {
  it('deletes a deal that is still just a lead', async () => {
    const res = await DELETE(delReq(), params('deal-lead'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(fake._all('deals').find((r) => r.id === 'deal-lead')).toBeUndefined()
  })

  it('blocks deleting a deal marked Sold', async () => {
    const res = await DELETE(delReq(), params('deal-sold'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/sold/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-sold')).toBeDefined()
  })

  it('blocks deleting a deal with an accepted linked quote', async () => {
    const res = await DELETE(delReq(), params('deal-converted-quote'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/quote/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-converted-quote')).toBeDefined()
  })

  it("tenant A cannot delete tenant B's deal", async () => {
    const res = await DELETE(delReq(), params('deal-B1'))
    await res.json()
    expect(fake._all('deals').find((r) => r.id === 'deal-B1')).toBeDefined()
  })
})
