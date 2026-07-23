import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant isolation — PUT /api/quote-budgets/:quoteId.
 *
 * Budget line items' service_type_id/category_id came straight from the
 * request body with no ownership check -- a caller in tenant A's own quote
 * could tag a budget line with tenant B's real service_type_id/category_id
 * (plain uuid PKs, no per-tenant namespace, no composite FK at the DB
 * level). Not a direct read-leak from THIS route (it returns raw ids, no
 * name embed), but still real cross-tenant reference pollution -- same
 * ownership-check gap already fixed on job-expenses. Proves the check.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId = 'tenant-A'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const A = 'tenant-A'
const B = 'tenant-B'
const QUOTE_A = '00000000-0000-0000-0000-0000000000a1'
const SVC_A = '00000000-0000-0000-0000-0000000000a2'
const SVC_B = '00000000-0000-0000-0000-0000000000b2'
const CAT_A = '00000000-0000-0000-0000-0000000000a3'
const CAT_B = '00000000-0000-0000-0000-0000000000b3'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A
  fake._seed('quotes', [{ id: QUOTE_A, tenant_id: A }])
  fake._seed('service_types', [
    { id: SVC_A, tenant_id: A, name: 'A Service' },
    { id: SVC_B, tenant_id: B, name: 'B Service' },
  ])
  fake._seed('categories', [
    { id: CAT_A, tenant_id: A, name: 'A Category' },
    { id: CAT_B, tenant_id: B, name: 'B Category' },
  ])
})

function put(lineItems: unknown[]) {
  return PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify({ line_items: lineItems }) }), {
    params: Promise.resolve({ quoteId: QUOTE_A }),
  })
}

describe('PUT /api/quote-budgets/:quoteId — cross-tenant reference isolation', () => {
  it("REJECTS a service_type_id belonging to another tenant, no line items saved", async () => {
    const res = await put([{ label: 'Line 1', service_type_id: SVC_B }])
    expect(res.status).toBe(400)
    expect(fake._all('budget_line_items')).toHaveLength(0)
  })

  it("REJECTS a category_id belonging to another tenant", async () => {
    const res = await put([{ label: 'Line 1', category_id: CAT_B }])
    expect(res.status).toBe(400)
    expect(fake._all('budget_line_items')).toHaveLength(0)
  })

  it("positive control: the same tenant's own service_type_id/category_id are accepted", async () => {
    const res = await put([{ label: 'Line 1', service_type_id: SVC_A, category_id: CAT_A }])
    expect(res.status).toBe(200)
    expect(fake._all('budget_line_items')).toHaveLength(1)
  })
})
