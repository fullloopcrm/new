/**
 * POST /api/quotes — cross-tenant FK injection on client_id/deal_id (same
 * class as the already-fixed PATCH /api/quotes/[id] and
 * PATCH /api/invoices/[id] guards). The create route inserted these two FKs
 * straight from the request body with zero tenant-ownership check, so a
 * caller could attach a brand-new quote to another tenant's client and
 * exfiltrate that client's name/email/phone/address via the clients() join
 * used by this route's own GET and GET /api/quotes/[id].
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-query')>()
  return { ...actual, getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a) }
})
vi.mock('@/lib/quote', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generatePublicToken: () => 'tok_test',
  generateQuoteNumber: vi.fn(async () => 'Q-0001'),
  logQuoteEvent: vi.fn(async () => {}),
}))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: TENANT_A }))
  h.store = {
    quotes: [],
    clients: [
      { id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' },
      { id: 'client-B1', tenant_id: TENANT_B, name: 'Pat B (secret)' },
    ],
    deals: [
      { id: 'deal-A1', tenant_id: TENANT_A },
      { id: 'deal-B1', tenant_id: TENANT_B },
    ],
    deal_activities: [],
  }
})

describe('POST /api/quotes — cross-tenant FK injection', () => {
  it("rejects a client_id belonging to another tenant and does not insert a quote", async () => {
    const res = await POST(postReq({ client_id: 'client-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.quotes.length).toBe(0)
  })

  it("rejects a deal_id belonging to another tenant", async () => {
    const res = await POST(postReq({ deal_id: 'deal-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.quotes.length).toBe(0)
  })

  it('creates the quote when client_id/deal_id genuinely belong to the caller tenant', async () => {
    const res = await POST(postReq({ client_id: 'client-A1', deal_id: 'deal-A1', silent: true }))

    expect(res.status).toBe(200)
    expect(h.store.quotes.length).toBe(1)
    expect(h.store.quotes[0].client_id).toBe('client-A1')
  })

  it('creates the quote with no FKs attached when none are supplied', async () => {
    const res = await POST(postReq({ title: 'Standalone' }))

    expect(res.status).toBe(200)
    expect(h.store.quotes.length).toBe(1)
    expect(h.store.quotes[0].client_id).toBe(null)
  })
})
