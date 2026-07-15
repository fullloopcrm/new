import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/deals/[id]/activities (converted to tenantDb).
 *
 * The ownership guard (deal lookup by id) now runs through tenantDb, so a deal
 * id belonging to a FOREIGN tenant resolves to "not found" (404), never leaking
 * that deal's activities or letting a caller attach an activity to it. GET/POST
 * on an owned deal also only ever touch that tenant's `deal_activities` rows.
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

import { GET, POST } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-a1', tenant_id: A, title: 'A Deal', updated_at: '2026-01-01', last_activity_at: '2026-01-01' },
      { id: 'deal-b1', tenant_id: B, title: 'Foreign Deal', updated_at: '2026-01-01', last_activity_at: '2026-01-01' },
    ],
    deal_activities: [
      { id: 'act-a1', tenant_id: A, deal_id: 'deal-a1', type: 'note', description: 'A note', created_at: '2026-01-01' },
      { id: 'act-b1', tenant_id: B, deal_id: 'deal-b1', type: 'note', description: 'Foreign note', created_at: '2026-01-01' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('deals/[id]/activities — tenant isolation', () => {
  it("GET on the acting tenant's own deal returns only its activities", async () => {
    const res = await GET(new Request('http://t'), params('deal-a1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect((body as Array<{ id: string }>).map((a) => a.id)).toEqual(['act-a1'])
  })

  it("WRONG-TENANT PROBE: GET on a foreign tenant's deal id returns 404, not the foreign activities", async () => {
    const res = await GET(new Request('http://t'), params('deal-b1'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deal not found')
  })

  it("WRONG-TENANT PROBE: POST against a foreign tenant's deal id is rejected, not attached", async () => {
    const req = new Request('http://t', {
      method: 'POST',
      body: JSON.stringify({ type: 'note', description: 'attempted cross-tenant note' }),
    })
    const res = await POST(req, params('deal-b1'))
    expect(res.status).toBe(404)

    const inserted = h.capture.inserts.find((i) => i.table === 'deal_activities')
    expect(inserted).toBeUndefined()
  })

  it('POST on an owned deal stamps the acting tenant and bumps last_activity_at', async () => {
    const req = new Request('http://t', {
      method: 'POST',
      body: JSON.stringify({ type: 'call', description: 'Called client' }),
    })
    const res = await POST(req, params('deal-a1'))
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.find((i) => i.table === 'deal_activities')
    expect(inserted!.rows[0].tenant_id).toBe(A)
    expect(inserted!.rows[0].deal_id).toBe('deal-a1')

    const updated = h.capture.updates.find((u) => u.table === 'deals')
    expect(updated!.matched.map((r) => r.id)).toEqual(['deal-a1'])
    expect(updated!.values.last_contacted_at).toBeDefined()
  })
})
