import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/invoices previously accepted body.entity_id verbatim with no
 * isEntityOwnedByTenant check, unlike every sibling finance write route
 * (expenses, bank-accounts, periods, cpa-tokens). A foreign entity_id is a
 * dangling cross-tenant reference other finance routes join entities(name)
 * by. Fixed by verifying entity_id belongs to the caller's tenant before
 * insert (404 on miss).
 */

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    invoices: [],
    entities: [
      { id: 'ent-A', tenant_id: TENANT_A, name: 'A-Entity' },
      { id: 'ent-B', tenant_id: TENANT_B, name: 'B-Entity' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/invoice', async (orig) => {
  const actual = await orig<typeof import('@/lib/invoice')>()
  return {
    ...actual,
    generateInvoiceNumber: async () => 'INV-TEST-0001',
    logInvoiceEvent: async () => {},
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const lineItems = [{ name: 'Deep clean', quantity: 1, unit_price_cents: 10000 }]

describe('POST /api/invoices — cross-tenant entity_id FK-injection guard', () => {
  it('LOCK: rejects a foreign entity_id (404), no invoices row created', async () => {
    const res = await POST(postReq({ entity_id: 'ent-B', line_items: lineItems }))
    expect(res.status).toBe(404)
    expect(fake._all('invoices').length).toBe(0)
  })

  it('CONTROL: omitting entity_id resolves to the caller\'s own default (null, no default seeded)', async () => {
    const res = await POST(postReq({ line_items: lineItems }))
    expect(res.status).toBe(200)
  })

  it('CONTROL: explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await POST(postReq({ entity_id: 'ent-A', line_items: lineItems }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.invoice.entity_id).toBe('ent-A')
  })
})
