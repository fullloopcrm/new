/**
 * PUT /api/deals (base route) — stage:'removed'/'booked' financial-lock
 * bypass.
 *
 * This branch flips `deals.stage` to a legacy value with zero guard,
 * regardless of the deal's current stage. checkDealDeletable (used by both
 * DELETE /api/deals/[id] and the now-guarded DELETE /api/deals) blocks
 * destroying a deal only while `stage === 'sold'` or it carries real quote
 * history — so this PUT was a live side-channel: flip a Sold deal's stage to
 * 'removed' here first (no check at all), and the delete guard on *both*
 * DELETE doors no longer recognizes it as sold, clearing the way to destroy
 * it. Fixed by routing this stage flip through the same checkDealDeletable
 * gate the delete doors use.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A } = vi.hoisted(() => ({ TENANT_A: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    deals: [
      { id: 'deal-lead', tenant_id: TENANT_A, title: 'Cold lead', stage: 'lead' },
      { id: 'deal-sold', tenant_id: TENANT_A, title: 'Closed deal', stage: 'sold' },
      { id: 'deal-converted-quote', tenant_id: TENANT_A, title: 'Quoted deal', stage: 'quoted' },
    ],
    quotes: [
      { id: 'q-1', tenant_id: TENANT_A, deal_id: 'deal-converted-quote', status: 'accepted', deposit_paid_at: null, converted_job_id: null },
    ],
    deal_activities: [],
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
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const putReq = (body: Record<string, unknown>) =>
  new Request('http://x', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe("PUT /api/deals — stage:'removed' financial-lock bypass", () => {
  it("blocks flipping a Sold deal's stage to 'removed'", async () => {
    const res = await PUT(putReq({ id: 'deal-sold', stage: 'removed' }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/sold/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-sold')?.stage).toBe('sold')
  })

  it('blocks it on a deal with an accepted linked quote too', async () => {
    const res = await PUT(putReq({ id: 'deal-converted-quote', stage: 'booked' }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/quote/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-converted-quote')?.stage).toBe('quoted')
  })

  it('still allows the stage flip on a plain open lead', async () => {
    const res = await PUT(putReq({ id: 'deal-lead', stage: 'removed' }))
    expect(res.status).toBe(200)
    expect(fake._all('deals').find((r) => r.id === 'deal-lead')?.stage).toBe('removed')
  })

  it('leaves non-stage edits (notes/follow-up) unaffected by the guard', async () => {
    const res = await PUT(putReq({ id: 'deal-sold', notes: 'called client back' }))
    expect(res.status).toBe(200)
    expect(fake._all('deals').find((r) => r.id === 'deal-sold')?.notes).toBe('called client back')
  })
})
