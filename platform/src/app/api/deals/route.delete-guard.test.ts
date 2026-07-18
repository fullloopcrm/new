/**
 * DELETE /api/deals (base route) — sold/converted-deal delete guard.
 *
 * This is a second, legacy door onto the `deals` table (the dashboard's
 * pipeline UI only ever calls DELETE /api/deals/[id], never this base
 * route's DELETE) but it's still a live, sales.edit-gated endpoint. Unlike
 * its sibling DELETE /api/deals/[id] (route.delete-guard.test.ts), this
 * handler hard-deleted unconditionally with no checkDealDeletable call at
 * all — any sales.edit caller could DELETE /api/deals {id} on a deal marked
 * Sold or with a real accepted/deposit-paid/converted quote, permanently
 * destroying it and (per deal_activities' NOT NULL ON DELETE CASCADE to
 * deals, migration 011) its entire activity/audit trail, completely
 * bypassing the exact protection the [id] route enforces on the same table.
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
const delReq = (id: string) =>
  new Request('http://x', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })

describe('DELETE /api/deals (base route) — sold/converted-deal delete guard', () => {
  it('deletes a deal that is still just a lead', async () => {
    const res = await DELETE(delReq('deal-lead'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(fake._all('deals').find((r) => r.id === 'deal-lead')).toBeUndefined()
  })

  it('blocks deleting a deal marked Sold', async () => {
    const res = await DELETE(delReq('deal-sold'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/sold/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-sold')).toBeDefined()
  })

  it('blocks deleting a deal with an accepted linked quote', async () => {
    const res = await DELETE(delReq('deal-converted-quote'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/quote/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-converted-quote')).toBeDefined()
  })

  it("tenant A cannot delete tenant B's deal", async () => {
    const res = await DELETE(delReq('deal-B1'))
    await res.json()
    expect(fake._all('deals').find((r) => r.id === 'deal-B1')).toBeDefined()
  })
})
