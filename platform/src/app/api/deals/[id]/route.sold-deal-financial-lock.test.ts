/**
 * PATCH /api/deals/:id — sold/converted-deal financial-lock guard.
 *
 * DELETE already blocks hard-deleting a deal once it carries real revenue
 * history (stage 'sold', or a linked quote that's accepted/deposit-paid/
 * converted — checkDealDeletable, route.delete-guard.test.ts). PATCH had no
 * equivalent guard: any sales.edit caller could silently rewrite
 * value_cents/client_id on that same closed deal — misattributing already-
 * collected revenue to a different client, or diverging the reported deal
 * value from what actually sold — with no audit trail and no way to
 * reconcile it afterward. Fixed by gating PATCH the same way DELETE is
 * gated, but only when the request actually changes value_cents or
 * client_id (not merely includes them at their current value, since the
 * dashboard's save form always resends both alongside notes/follow-up
 * edits — gating on presence would break ordinary post-sale note-taking).
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, CLIENT_A, CLIENT_A2 } = vi.hoisted(() => ({
  TENANT_A: 'tenant-A',
  CLIENT_A: 'client-A',
  CLIENT_A2: 'client-A2',
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    deals: [
      { id: 'deal-open', tenant_id: TENANT_A, title: 'Open lead', stage: 'lead', value_cents: 10000, client_id: CLIENT_A },
      { id: 'deal-sold', tenant_id: TENANT_A, title: 'Closed deal', stage: 'sold', value_cents: 50000, client_id: CLIENT_A },
      { id: 'deal-quoted', tenant_id: TENANT_A, title: 'Quoted deal', stage: 'quoted', value_cents: 20000, client_id: CLIENT_A },
    ],
    quotes: [
      { id: 'q-1', tenant_id: TENANT_A, deal_id: 'deal-quoted', status: 'accepted', deposit_paid_at: null, converted_job_id: null },
    ],
    clients: [
      { id: CLIENT_A, tenant_id: TENANT_A, name: 'Client A' },
      { id: CLIENT_A2, tenant_id: TENANT_A, name: 'Client A2' },
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
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown) =>
  new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

describe('PATCH /api/deals/:id — sold/converted-deal financial-lock guard', () => {
  it('edits value_cents/client_id freely on a deal still open', async () => {
    const res = await PATCH(patchReq({ value_cents: 15000, client_id: CLIENT_A2 }), params('deal-open'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deal.value_cents).toBe(15000)
    expect(json.deal.client_id).toBe(CLIENT_A2)
  })

  it('allows notes/follow-up edits on a Sold deal that resend the same value_cents', async () => {
    const res = await PATCH(
      patchReq({ value_cents: 50000, client_id: CLIENT_A, notes: 'called client to thank them', title: 'Closed deal' }),
      params('deal-sold'),
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deal.notes).toBe('called client to thank them')
    expect(json.deal.value_cents).toBe(50000)
  })

  it('blocks changing value_cents on a deal marked Sold', async () => {
    const res = await PATCH(patchReq({ value_cents: 1 }), params('deal-sold'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/sold/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-sold')?.value_cents).toBe(50000)
  })

  it('blocks reassigning client_id on a deal marked Sold', async () => {
    const res = await PATCH(patchReq({ client_id: CLIENT_A2 }), params('deal-sold'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(fake._all('deals').find((r) => r.id === 'deal-sold')?.client_id).toBe(CLIENT_A)
  })

  it('blocks changing value_cents on a deal with an accepted linked quote (not yet Sold)', async () => {
    const res = await PATCH(patchReq({ value_cents: 1 }), params('deal-quoted'))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/quote/i)
    expect(fake._all('deals').find((r) => r.id === 'deal-quoted')?.value_cents).toBe(20000)
  })

  it('still allows non-financial edits on a deal with an accepted linked quote', async () => {
    const res = await PATCH(patchReq({ notes: 'following up next week' }), params('deal-quoted'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.deal.notes).toBe('following up next week')
  })

  it('returns 404 for a missing deal', async () => {
    const res = await PATCH(patchReq({ notes: 'x' }), params('deal-nope'))
    expect(res.status).toBe(404)
  })
})
