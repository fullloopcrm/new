import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/invoices.
 *
 * This route is UNCONVERTED (raw `supabaseAdmin`, not `tenantDb`) and is a HARD-tier
 * parent-ownership gap per deploy-prep/tenantdb-rollout-plan.md §5b.
 *
 * The invoice row is correctly stamped `tenant_id = <acting tenant>`, BUT the
 * caller-supplied `body.client_id` / `body.booking_id` / `body.quote_id` are
 * inserted VERBATIM with NO check that those ids belong to the acting tenant.
 * (Only the `from_booking_id` / `from_quote_id` PREFILL paths re-fetch with
 * `.eq('tenant_id', …)`, so those are already scoped — see the control below.)
 *
 * Effect TODAY: an operator in tenant A can create an invoice that references
 * tenant B's client / booking / quote — a cross-tenant reference write that
 * pollutes B's entities into A's finance records and can surface B's data through
 * any read-side that embeds `clients(...)` off the invoice.
 *
 * These tests assert the leak is CURRENTLY LIVE. When an ownership guard lands
 * (verify body.client_id/booking_id/quote_id belong to `tenantId` before insert,
 * else 400/404), FLIP them to expect rejection — turning this into the regression
 * lock for that fix.
 *
 * Mutation-safe: the RED assertions read the ACTUAL stored `client_id`/`booking_id`;
 * an ownership guard that rejects or nulls a foreign id makes them fail.
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
    bookings: [{ id: 'bk-b', tenant_id: OTHER_TENANT, price: 12345, actual_hours: 2 }],
    quotes: [] as Record<string, unknown>[],
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

describe('invoices POST — cross-tenant FK injection WITNESS', () => {
  it('LEAK: a foreign client_id from the body is stored on the acting tenant\'s invoice', async () => {
    const res = await POST(postReq({ client_id: 'client-b', line_items: [] }))
    expect(res.status).toBe(200)

    const ins = h.capture.inserts.find((i) => i.table === 'invoices')
    expect(ins).toBeTruthy()
    const row = ins!.rows[0]
    // Invoice is stamped to tenant A …
    expect(row.tenant_id).toBe(CTX_TENANT)
    // … yet references tenant B's client — no ownership check ran.
    expect(row.client_id).toBe('client-b')
  })

  it('LEAK: a foreign booking_id + quote_id from the body pass through unchecked', async () => {
    const res = await POST(postReq({ booking_id: 'bk-b', quote_id: 'q-b', line_items: [] }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'invoices')!.rows[0]
    expect(row.booking_id).toBe('bk-b')
    expect(row.quote_id).toBe('q-b')
  })

  it('MIXED (fetch scoped, column not): from_booking_id 404s the foreign booking so NO client PII is copied, but the raw booking_id column is still written', async () => {
    // The from_booking_id PREFILL re-fetches with .eq('tenant_id', A), so B's booking
    // is invisible → prefillContact stays empty → no B client_id/name is copied. GOOD.
    // BUT the insert line is `booking_id: body.booking_id || body.from_booking_id || null`,
    // so the unverified foreign booking id still lands in the column. STILL A LEAK.
    const res = await POST(postReq({ from_booking_id: 'bk-b', line_items: [] }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'invoices')!.rows[0]
    // Scoped: the guarded fetch leaked no client PII into the invoice.
    expect(row.client_id).toBeNull()
    // Not scoped: the foreign booking id is written verbatim anyway.
    expect(row.booking_id).toBe('bk-b')
  })
})
