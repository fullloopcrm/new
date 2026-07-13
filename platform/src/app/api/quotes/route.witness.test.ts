import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/quotes. FIXED.
 *
 * UNCONVERTED route (raw `supabaseAdmin`). See
 * deploy-prep/cross-tenant-leak-register.md P3.
 *
 * `body.client_id` and `body.deal_id` are now verified to belong to the acting
 * tenant before the quote insert runs; a foreign id 404s the request before any
 * row is written.
 *
 * The pre-existing asymmetry is preserved as a control: the follow-up `deals`
 * UPDATE (on close/link) was already correctly scoped
 * `.eq('id', dealId).eq('tenant_id', A)` — that guard still holds, it's just no
 * longer reachable with a foreign deal_id since the insert now 404s first.
 *
 * LOCKED: these assertions prove the guard fires per id.
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
    deals: [
      { id: 'deal-a', tenant_id: CTX_TENANT, stage: 'open', name: 'A-Deal' },
      { id: 'deal-b', tenant_id: OTHER_TENANT, stage: 'open', name: 'B-Deal' },
    ],
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

describe('quotes POST — cross-tenant FK injection LOCKED', () => {
  it('LOCKED: a foreign client_id 404s before any quote is inserted', async () => {
    const res = await POST(postReq({ client_id: 'client-b', silent: true, line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'quotes')).toBeUndefined()
  })

  it('LOCKED: a foreign deal_id 404s before any quote is inserted (and the deals UPDATE never runs)', async () => {
    const res = await POST(postReq({ deal_id: 'deal-b', line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'quotes')).toBeUndefined()
    expect(h.capture.updates.find((u) => u.table === 'deals')).toBeUndefined()

    // Victim's deal is untouched.
    const victim = h.seed.deals.find((d) => d.id === 'deal-b')
    expect(victim?.stage).toBe('open')
  })

  it('CONTROL: own-tenant client_id + deal_id pass, quote is created, and the deals write-back still only touches the owned deal', async () => {
    const res = await POST(postReq({ client_id: 'client-a', deal_id: 'deal-a', line_items: [] }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'quotes')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.client_id).toBe('client-a')
    expect(row.deal_id).toBe('deal-a')

    const upd = h.capture.updates.find((u) => u.table === 'deals')
    expect(upd?.matched.map((d) => d.id)).toEqual(['deal-a'])
  })
})
