import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/quotes.
 *
 * UNCONVERTED route (raw `supabaseAdmin`). HARD-tier parent-ownership gap per
 * deploy-prep/tenantdb-rollout-plan.md §5b.
 *
 * The quote row is stamped `tenant_id = <acting tenant>`, but the caller-supplied
 * `body.client_id` and `body.deal_id` are inserted VERBATIM with NO check that
 * those ids belong to the acting tenant. So an operator in tenant A can create a
 * quote that references tenant B's client / deal.
 *
 * Note the asymmetry proven by the control below: the follow-up `deals` UPDATE
 * (on close/link) IS correctly scoped `.eq('id', dealId).eq('tenant_id', A)`, so
 * B's deal row is never mutated — yet the quote INSERT that references it is not
 * scoped at all. The guard exists on the write-back but not on the reference.
 *
 * Assert the leak is CURRENTLY LIVE. When an ownership guard lands (verify
 * body.client_id/deal_id belong to `tenantId` before insert), FLIP to expect
 * rejection.
 *
 * Mutation-safe: the RED assertions read the ACTUAL stored client_id/deal_id.
 */

const CTX_TENANT = 'tid-a' // attacker
const OTHER_TENANT = 'tid-b' // victim

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/quote', () => ({
  normalizeLineItems: (x: unknown[]) => x || [],
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generatePublicToken: () => 'tok-q',
  generateQuoteNumber: async () => 'Q-0001',
  logQuoteEvent: async () => {},
}))

import { POST } from './route'

function seed() {
  return {
    quotes: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client' },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'B-Client' },
    ],
    // Victim's deal — the write-back guard should protect it.
    deals: [{ id: 'deal-b', tenant_id: OTHER_TENANT, stage: 'open', name: 'B-Deal' }],
    deal_activities: [] as Record<string, unknown>[],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/quotes', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('quotes POST — cross-tenant FK injection WITNESS', () => {
  it('LEAK: a foreign client_id + deal_id from the body are stored on the acting tenant\'s quote', async () => {
    // silent:true skips the deal write-back branch — isolate the insert leak.
    const res = await POST(postReq({ client_id: 'client-b', deal_id: 'deal-b', silent: true, line_items: [] }))
    expect(res.status).toBe(200)

    const ins = h.capture.inserts.find((i) => i.table === 'quotes')
    expect(ins).toBeTruthy()
    const row = ins!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.client_id).toBe('client-b') // tenant B's client, no ownership check
    expect(row.deal_id).toBe('deal-b') // tenant B's deal, no ownership check
  })

  it('CONTROL (write-back scoped): the deals UPDATE on link never mutates the victim tenant\'s deal', async () => {
    const res = await POST(postReq({ deal_id: 'deal-b', line_items: [] })) // silent falsy → write-back runs
    expect(res.status).toBe(200)

    // The deals update is .eq('id','deal-b').eq('tenant_id', A) — matches nothing (deal-b is B's).
    const upd = h.capture.updates.find((u) => u.table === 'deals')
    if (upd) expect(upd.matched).toHaveLength(0)
    // Victim's deal is untouched.
    const victim = h.seed.deals.find((d) => d.id === 'deal-b')
    expect(victim?.stage).toBe('open')
  })
})
