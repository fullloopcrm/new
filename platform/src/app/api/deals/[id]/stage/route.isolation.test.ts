import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/deals/[id]/stage (POST, converted to tenantDb).
 *
 * The deal lookup + update now run through tenantDb, so a deal id belonging to
 * a FOREIGN tenant resolves to "Not found" (404) and is never read or moved,
 * and the stage-change activity is never attached to a foreign deal.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { POST } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-a1', tenant_id: A, stage: 'new', title: 'A Deal', value_cents: 1000, probability: 10 },
      { id: 'deal-b1', tenant_id: B, stage: 'new', title: 'Foreign Deal', value_cents: 2000, probability: 10 },
    ],
    deal_activities: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(stage: string) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ stage }) })
}
function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('deals/[id]/stage — tenant isolation', () => {
  it('moves the acting tenant\'s own deal to a new stage', async () => {
    const res = await POST(req('qualifying'), params('deal-a1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.stage).toBe('qualifying')

    const activity = h.capture.inserts.find((i) => i.table === 'deal_activities')
    expect(activity!.rows[0].tenant_id).toBe(A)
    expect(activity!.rows[0].deal_id).toBe('deal-a1')
  })

  it("WRONG-TENANT PROBE: POST against a foreign tenant's deal id returns 404, not moved", async () => {
    const res = await POST(req('qualifying'), params('deal-b1'))
    expect(res.status).toBe(404)

    // The foreign deal never moved.
    const foreign = h.seed.deals.find((d) => d.id === 'deal-b1')!
    expect(foreign.stage).toBe('new')

    // No activity attached to the foreign deal.
    const activity = h.capture.inserts.find((i) => i.table === 'deal_activities')
    expect(activity).toBeUndefined()
  })

  it('rejects an invalid stage before touching the deal', async () => {
    const res = await POST(req('bogus'), params('deal-a1'))
    expect(res.status).toBe(400)
  })
})
