/**
 * PATCH /api/quotes/[id] — cross-tenant FK injection on client_id (P9
 * register, same class W2 found on p1-w2/p1-w3). Same shape as
 * invoices/[id]'s sibling fix: client_id passed through an allowlist with
 * only `.eq('tenant_id', tenantId)` on the WHERE clause -- nothing verified
 * the FK VALUE itself belonged to the caller's tenant.
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
  logQuoteEvent: vi.fn(async () => {}),
}))

import { PATCH } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: TENANT_A, role: 'owner' }))
  h.store = {
    quotes: [{ id: 'q-1', tenant_id: TENANT_A, status: 'draft', client_id: 'client-A1', deal_id: null }],
    clients: [{ id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' }, { id: 'client-B1', tenant_id: TENANT_B, name: 'Pat B (secret)' }],
    deals: [{ id: 'deal-A1', tenant_id: TENANT_A, title: 'Deal A' }, { id: 'deal-B1', tenant_id: TENANT_B, title: 'Deal B (secret)' }],
  }
})

describe('PATCH /api/quotes/[id] — cross-tenant FK injection', () => {
  it("rejects a client_id belonging to another tenant instead of writing it", async () => {
    const res = await PATCH(patchReq({ client_id: 'client-B1' }), params('q-1'))

    expect(res.status).toBe(400)
    expect(h.store.quotes[0].client_id).toBe('client-A1')
  })

  it('still updates the quote when client_id genuinely belongs to the caller tenant', async () => {
    const res = await PATCH(patchReq({ client_id: 'client-A1', notes: 'updated' }), params('q-1'))

    expect(res.status).toBe(200)
    expect(h.store.quotes[0].notes).toBe('updated')
  })

  it("rejects a deal_id belonging to another tenant instead of writing it", async () => {
    const res = await PATCH(patchReq({ deal_id: 'deal-B1' }), params('q-1'))

    expect(res.status).toBe(400)
    expect(h.store.quotes[0].deal_id).toBe(null)
  })

  it('persists deal_id on PATCH when it genuinely belongs to the caller tenant (regression: allowlist previously dropped this field entirely)', async () => {
    const res = await PATCH(patchReq({ deal_id: 'deal-A1' }), params('q-1'))

    expect(res.status).toBe(200)
    expect(h.store.quotes[0].deal_id).toBe('deal-A1')
  })
})
