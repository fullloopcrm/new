import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleShopOrder() — silent-failure audit fix (2026-08-12).
 *
 * Three lookups inside handleShopOrder() destructured only `data` off a
 * Supabase call and never checked `error`, so a transient DB failure looked
 * identical to "found nothing" and the function returned (or defaulted)
 * silently with zero log, zero alert:
 *
 *  1. tenants lookup (CRITICAL) — session is already paid by the time
 *     checkout.session.completed fires; losing this lookup meant NO
 *     shop_orders row was ever created and nothing said so.
 *  2. service_types catalog lookup (HIGH) — a failure here made every line
 *     item default isDigital:false, so a paid digital item silently got
 *     treated as physical (no download link, wrong fulfillment queue).
 *  3. shop_orders existing-session check (MEDIUM) — lower-consequence
 *     (the unique index on stripe_checkout_session_id is a real backstop),
 *     but the same unchecked-error shape immediately above bug #1.
 *
 * These tests drive each failure path and assert trackError now actually
 * gets called with the right source/severity instead of the failure
 * vanishing. Mocking follows route.test.ts's per-table chain-builder
 * convention already established in this same directory.
 */

const trackError = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/error-tracking', () => ({ trackError }))

const SESSION_ID = 'cs_test_shop_1'

function shopEvent() {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: SESSION_ID,
        metadata: { tenant_id: 'tenant_1', source: 'shop' },
        amount_total: 5000,
        customer_details: { email: 'buyer@example.com', name: 'Buyer One', phone: null },
      },
    },
  }
}

// One line item carrying a service_type_id so the service_types catalog
// query actually runs (it's skipped entirely when no line item references a
// catalog item — see handleShopOrder's `serviceTypeIds.length ? … : …`).
const lineItemsWithCatalogRef = {
  data: [
    {
      description: 'Digital Guide',
      quantity: 1,
      price: { unit_amount: 5000, product: { id: 'prod_1', metadata: { service_type_id: 'st_1' } } },
    },
  ],
}

let currentEvent: ReturnType<typeof shopEvent>
let currentLineItems: typeof lineItemsWithCatalogRef | { data: never[] }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => currentEvent }
    checkout = { sessions: { listLineItems: async () => currentLineItems } }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

// ── Per-test table behavior ──
let tenantLookupError: { code?: string; message: string } | null = null
let tenantRow: Record<string, unknown> | null = { id: 'tenant_1', name: 'Test Tenant', setup_progress: null }
let existingOrderError: { message: string } | null = null
let catalogError: { message: string } | null = null
const adminTaskInserts: Array<Record<string, unknown>> = []
let orderInsertResult: { data: { id: string } | null; error: { code?: string; message: string } | null } = {
  data: { id: 'order-1' },
  error: null,
}

function tableBuilder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    insert: (row: Record<string, unknown>) => {
      if (table === 'admin_tasks') {
        adminTaskInserts.push(row)
        return chain
      }
      if (table === 'shop_orders') {
        return { select: () => ({ single: async () => orderInsertResult }) }
      }
      return chain
    },
    maybeSingle: async () => {
      if (table === 'shop_orders') return { data: null, error: existingOrderError }
      return { data: null, error: null }
    },
    single: async () => {
      if (table === 'tenants') return { data: tenantLookupError ? null : tenantRow, error: tenantLookupError }
      return { data: null, error: null }
    },
    then: (resolve: (v: unknown) => void) => {
      if (table === 'service_types') return resolve({ data: catalogError ? null : [{ id: 'st_1', is_digital: true, digital_delivery_url: 'https://dl.example.com/x' }], error: catalogError })
      return resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => tableBuilder(table) },
}))

vi.mock('@/lib/finance/post-revenue', () => ({
  postShopOrderRevenue: vi.fn(async () => ({})),
  postPaymentRevenue: vi.fn(async () => ({})),
}))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}), tenantSender: () => 'test@example.com' }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: () => 'https://test.example.com' }))

import { POST } from './route'

function req(): Request {
  return { text: async () => '{}', headers: { get: () => 'sig_test' } } as unknown as Request
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  currentEvent = shopEvent()
  currentLineItems = { data: [] }
  tenantLookupError = null
  tenantRow = { id: 'tenant_1', name: 'Test Tenant', setup_progress: null }
  existingOrderError = null
  catalogError = null
  adminTaskInserts.length = 0
  orderInsertResult = { data: { id: 'order-1' }, error: null }
  trackError.mockClear()
})

describe('handleShopOrder — tenant lookup error is no longer silent', () => {
  it('a real query error tracks CRITICAL and returns without creating an order', async () => {
    tenantLookupError = { message: 'connection reset' }
    const res = await POST(req())
    expect(res.status).toBe(200) // still 200 to Stripe — no retry-storm on this path
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'webhooks/stripe:handleShopOrder:tenant-lookup', severity: 'critical', tenantId: 'tenant_1' }),
    )
  })

  it('tenant truly not found (PGRST116) tracks HIGH, not CRITICAL', async () => {
    tenantLookupError = { code: 'PGRST116', message: 'no rows' }
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'webhooks/stripe:handleShopOrder:tenant-lookup', severity: 'high', tenantId: 'tenant_1' }),
    )
  })
})

describe('handleShopOrder — catalog lookup error is no longer silent', () => {
  it('tracks HIGH and flags the order for manual review instead of guessing physical', async () => {
    currentLineItems = lineItemsWithCatalogRef
    catalogError = { message: 'timeout' }
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'webhooks/stripe:handleShopOrder:catalog-lookup', severity: 'high', tenantId: 'tenant_1' }),
    )
    expect(adminTaskInserts).toHaveLength(1)
    expect(adminTaskInserts[0]).toMatchObject({ tenant_id: 'tenant_1', related_type: 'shop_order', related_id: 'order-1' })
  })
})

describe('handleShopOrder — existing-session check error is no longer silent', () => {
  it('tracks MEDIUM but still proceeds to create the order (unique index is the real backstop)', async () => {
    existingOrderError = { message: 'read replica lag' }
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(trackError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'webhooks/stripe:handleShopOrder:existing-order-check', severity: 'medium', tenantId: 'tenant_1' }),
    )
  })
})
