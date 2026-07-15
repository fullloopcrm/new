import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/invoices. FIXED.
 *
 * This route is UNCONVERTED (raw `supabaseAdmin`, not `tenantDb`). See
 * deploy-prep/cross-tenant-leak-register.md P2.
 *
 * `body.client_id` / `body.booking_id` / `body.quote_id` / `body.entity_id` are
 * now verified to belong to the acting tenant (a fresh
 * `.eq('id',...).eq('tenant_id', tenantId)` lookup per id) before the invoice
 * insert runs; a foreign id 404s the request before any row is written.
 *
 * LOCKED: these assertions prove the guard fires per id. A regression that
 * drops any of the four checks flips this back to a leak.
 */

const CTX_TENANT = 'tid-a' // attacker (the caller)
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

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

// Deterministic, DB-free stubs for the route's finance helpers so the ONLY
// supabaseAdmin traffic that reaches the harness is the route's own queries.
vi.mock('@/lib/invoice', () => ({
  normalizeLineItems: (x: unknown[]) => x || [],
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generateInvoicePublicToken: () => 'tok-inv',
  generateInvoiceNumber: async () => 'INV-0001',
  logInvoiceEvent: async () => {},
}))
vi.mock('@/lib/entity', () => ({
  getDefaultEntityId: async () => 'entity-a',
  entityIdFromUrl: () => null,
}))

import { POST } from './route'

function seed() {
  return {
    invoices: [] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client' },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'B-Client' },
    ],
    // Victim's booking — used to prove the from_booking_id PREFILL path is scoped.
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, price: 5000, actual_hours: 1 },
      { id: 'bk-b', tenant_id: OTHER_TENANT, price: 12345, actual_hours: 2 },
    ],
    quotes: [{ id: 'q-a', tenant_id: CTX_TENANT, client_id: 'client-a', line_items: [] }],
    entities: [
      { id: 'entity-a', tenant_id: CTX_TENANT, name: 'A-Entity' },
      { id: 'entity-b', tenant_id: OTHER_TENANT, name: 'B-Entity' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/invoices', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('invoices POST — cross-tenant FK injection LOCKED', () => {
  it('LOCKED: a foreign client_id from the body 404s before any invoice is inserted', async () => {
    const res = await POST(postReq({ client_id: 'client-b', line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'invoices')).toBeUndefined()
  })

  it('LOCKED: a foreign booking_id 404s before any invoice is inserted', async () => {
    const res = await POST(postReq({ booking_id: 'bk-b', line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'invoices')).toBeUndefined()
  })

  it('LOCKED: a foreign quote_id 404s before any invoice is inserted', async () => {
    const res = await POST(postReq({ quote_id: 'q-b', line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'invoices')).toBeUndefined()
  })

  it('LOCKED: from_booking_id referencing a foreign booking 404s before any invoice is inserted', async () => {
    const res = await POST(postReq({ from_booking_id: 'bk-b', line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'invoices')).toBeUndefined()
  })

  it('LOCKED: a foreign entity_id 404s before any invoice is inserted (P2 gap, never had this check)', async () => {
    const res = await POST(postReq({ entity_id: 'entity-b', line_items: [] }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'invoices')).toBeUndefined()
  })

  it('CONTROL: own-tenant client_id/booking_id/quote_id/entity_id all pass and the invoice is created', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', booking_id: 'bk-a', quote_id: 'q-a', entity_id: 'entity-a', line_items: [] }),
    )
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'invoices')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.client_id).toBe('client-a')
    expect(row.booking_id).toBe('bk-a')
    expect(row.quote_id).toBe('q-a')
    expect(row.entity_id).toBe('entity-a')
  })

  it('CONTROL: no entity_id supplied falls back to the tenant-scoped default, no check needed', async () => {
    const res = await POST(postReq({ client_id: 'client-a', line_items: [] }))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find((i) => i.table === 'invoices')!.rows[0]
    expect(row.entity_id).toBe('entity-a')
  })
})
