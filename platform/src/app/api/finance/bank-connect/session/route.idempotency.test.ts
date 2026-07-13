import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * stripe.customers.create had no idempotencyKey. The route guards a REPEAT
 * click via `tenant.stripe_customer_id`, but a concurrent double-click races
 * past that read before either request's DB write lands, so both create a
 * Stripe customer and only one id survives on the tenant row — the other is
 * an orphan Stripe customer with no application record. The idempotencyKey
 * closes that race at the Stripe layer.
 */

const TENANT_ID = 'tenant_1'

const idempotencyStore = new Map<string, { id: string }>()
let realCustomerCount = 0
const customersCreate = vi.fn(async (_params: unknown, options?: { idempotencyKey?: string }) => {
  const key = options?.idempotencyKey
  if (key && idempotencyStore.has(key)) return idempotencyStore.get(key)!
  realCustomerCount++
  const customer = { id: `cus_${realCustomerCount}` }
  if (key) idempotencyStore.set(key, customer)
  return customer
})
const financialConnectionsSessionsCreate = vi.fn(async () => ({ client_secret: 'fcsess_secret_test' }))

vi.mock('stripe', () => {
  class MockStripe {
    customers = { create: customersCreate }
    financialConnections = { sessions: { create: financialConnectionsSessionsCreate } }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenant: { id: TENANT_ID, name: 'Test Tenant', owner_email: 'owner@example.com', stripe_api_key: null, stripe_customer_id: null },
    },
    error: null,
  })),
}))

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({ update: () => ({ eq: async () => ({ data: null, error: null }) }) }),
  },
}))

import { POST } from './route'

beforeEach(() => {
  customersCreate.mockClear()
  financialConnectionsSessionsCreate.mockClear()
  idempotencyStore.clear()
  realCustomerCount = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
})

describe('finance/bank-connect/session — concurrent double-click does not mint two Stripe customers', () => {
  it('passes a stable per-tenant idempotencyKey to stripe.customers.create', async () => {
    const first = await POST()
    const second = await POST()

    expect((await first.json()).client_secret).toBeDefined()
    expect((await second.json()).client_secret).toBeDefined()

    expect(customersCreate).toHaveBeenCalledTimes(2)
    const [, opts1] = customersCreate.mock.calls[0]
    const [, opts2] = customersCreate.mock.calls[1]
    expect(opts1).toEqual({ idempotencyKey: `stripe-customer-${TENANT_ID}` })
    expect(opts2).toEqual({ idempotencyKey: `stripe-customer-${TENANT_ID}` })

    // Same key both times => Stripe returns the SAME customer, never a
    // second real (orphan) Stripe customer object.
    expect(realCustomerCount).toBe(1)
  })
})
