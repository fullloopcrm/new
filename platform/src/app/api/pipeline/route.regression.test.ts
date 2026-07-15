import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Regression — GET /api/pipeline must not crash on non-canonical stages.
 *
 * PIPELINE_STAGES values are new/qualifying/quoted/pending/sold/lost — there is
 * NO 'lead' value. The old grouping code pushed orphan deals into an
 * uninitialized byStage['lead'], throwing "Cannot read properties of undefined
 * (reading 'push')". Deals with a null/empty or unknown `stage` must instead be
 * normalized into the first canonical bucket ('new', label "Lead").
 */

const A = 'tid-a'

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

import { GET } from './route'

function seed() {
  return {
    deals: [
      // null stage — the historical crash trigger
      { id: 'd-null', tenant_id: A, status: 'active', stage: null, value_cents: 100000, probability: 50, expected_close_date: null, clients: { id: 'cl-a', name: 'Client A' } },
      // empty-string stage — falsy, also hits the fallback
      { id: 'd-empty', tenant_id: A, status: 'active', stage: '', value_cents: 20000, probability: 10, expected_close_date: null, clients: { id: 'cl-b', name: 'Client B' } },
      // non-canonical stage value — truthy but not in PIPELINE_STAGES
      { id: 'd-bogus', tenant_id: A, status: 'active', stage: 'archived', value_cents: 30000, probability: 0, expected_close_date: null, clients: { id: 'cl-c', name: 'Client C' } },
      // a valid stage, to confirm normal grouping still works alongside
      { id: 'd-new', tenant_id: A, status: 'active', stage: 'new', value_cents: 40000, probability: 25, expected_close_date: null, clients: { id: 'cl-d', name: 'Client D' } },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('pipeline — non-canonical stage regression', () => {
  it('returns 200 and buckets orphan-stage deals into "new" instead of crashing', async () => {
    const res = await GET(new Request('http://t/api/pipeline'))
    expect(res.status).toBe(200) // was 500 (TypeError) before the fix

    const body = await res.json()
    expect(body.total).toBe(4)

    // every orphan deal lands in the first canonical bucket ('new'), none dropped
    const newIds = (body.byStage as Record<string, Array<{ id: string }>>)['new'].map((d) => d.id)
    expect(newIds).toEqual(expect.arrayContaining(['d-null', 'd-empty', 'd-bogus', 'd-new']))
    expect(newIds).toHaveLength(4)

    // no phantom 'lead' bucket is created
    expect(body.byStage).not.toHaveProperty('lead')

    // every returned bucket key is a real PIPELINE_STAGES value
    const keys = Object.keys(body.byStage as Record<string, unknown>)
    expect(keys).toEqual(expect.arrayContaining(['new', 'qualifying', 'quoted', 'pending', 'sold', 'lost']))
    for (const k of keys) {
      expect(['new', 'qualifying', 'quoted', 'pending', 'sold', 'lost']).toContain(k)
    }
  })
})
