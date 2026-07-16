/**
 * POST /api/deals/[id]/stage — TOCTOU race with a concurrent stage change on
 * the same deal.
 *
 * The route reads `existing.stage` once, then unconditionally UPDATEs with no
 * re-check in the write's own WHERE clause. A concurrent stage change — a
 * second admin dragging the kanban card, Selena's update_deal tool, or the
 * public quote-accept flow auto-advancing the deal on signature — landing
 * between that read and this write used to let this route silently clobber
 * the concurrent change (e.g. an admin marks a deal 'lost' while this request
 * is mid-flight moving it to 'quoted'; the 'lost' decision gets overwritten
 * and the activity log records a false `from` value).
 *
 * FIX: re-assert the pre-read stage in the write's own WHERE against the
 * CURRENT DB row. Zero rows matched -> 409 instead of silently overwriting
 * the concurrent change.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'owner' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

/** Set by a test to inject a concurrent write right after the route's own
 *  deal SELECT resolves -- the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'deals') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from './route'

const TENANT_ID = 'tenant-A'
const DEAL_ID = 'deal-1'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = TENANT_ID
  h.seq = 0
  h.role = 'owner'
  afterInitialRead.fn = null
})

describe('POST /api/deals/[id]/stage — concurrent-stage-change race', () => {
  it('refuses to apply a stage move once a concurrent change lands, instead of clobbering it', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'quoted', title: 'Big Job', value_cents: 5000, probability: 60 }],
      deal_activities: [],
    }
    // Concurrent write (another admin, or Selena) marks the deal lost right
    // after this route's own read.
    afterInitialRead.fn = () => {
      h.store.deals[0] = { ...h.store.deals[0], stage: 'lost' }
    }

    const res = await POST(postReq({ stage: 'sold' }), params(DEAL_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    expect(h.store.deals[0].stage).toBe('lost')
    expect(h.store.deal_activities).toHaveLength(0)
  })

  it('still moves a deal whose stage did not change concurrently (no regression)', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'new', title: 'Small Job', value_cents: 1000, probability: 10 }],
      deal_activities: [],
    }

    const res = await POST(postReq({ stage: 'qualifying' }), params(DEAL_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.deal.stage).toBe('qualifying')
    expect(h.store.deals[0].stage).toBe('qualifying')
  })

  it('returns ok:true, unchanged (not the race guard) when the requested stage matches the stale read', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'sold', title: 'Done Deal', value_cents: 2000, probability: 100 }],
      deal_activities: [],
    }
    afterInitialRead.fn = () => {
      h.store.deals[0] = { ...h.store.deals[0], stage: 'lost' }
    }

    const res = await POST(postReq({ stage: 'sold' }), params(DEAL_ID))
    const json = await res.json()

    // to === existing.stage short-circuits before the write entirely, so the
    // concurrent change from the hook above is irrelevant here.
    expect(res.status).toBe(200)
    expect(json.unchanged).toBe(true)
  })
})
