import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
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

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'cr-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}
function patchReq(status: string) {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status }) })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('client_reviews', [
    { id: SHARED_ID, tenant_id: A_ID, client_id: 'c-1', type: 'text', credit_amount: 10, status: 'pending', paid_at: null },
    { id: SHARED_ID, tenant_id: B_ID, client_id: 'c-2', type: 'text', credit_amount: 10, status: 'pending', paid_at: null },
  ])
})

describe('PATCH /api/client-reviews/[id]', () => {
  it('moves a credit from pending to verified', async () => {
    const res = await PATCH(patchReq('verified'), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credit.status).toBe('verified')
  })

  it("marking paid stamps paid_at and never touches tenant B's same-id row", async () => {
    const res = await PATCH(patchReq('paid'), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credit.status).toBe('paid')
    expect(body.credit.paid_at).toBeTruthy()

    const bRow = fake._all('client_reviews').find((r) => r.tenant_id === B_ID)!
    expect(bRow.status).toBe('pending')
  })

  it('rejects an unrecognized status before touching the database', async () => {
    const res = await PATCH(patchReq('refunded'), paramsFor(SHARED_ID))
    expect(res.status).toBe(400)
    const aRow = fake._all('client_reviews').find((r) => r.tenant_id === A_ID)!
    expect(aRow.status).toBe('pending')
  })

  it('a second paid request on an already-paid row is idempotent, not a 404', async () => {
    await PATCH(patchReq('paid'), paramsFor(SHARED_ID))
    const res2 = await PATCH(patchReq('paid'), paramsFor(SHARED_ID))
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.credit.status).toBe('paid')
  })
})
