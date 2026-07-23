import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant isolation — POST /api/jobs/:id/expenses.
 *
 * vendor_id / service_type_id / budget_line_item_id all came straight from
 * request body into the insert with no ownership check -- a caller in
 * tenant A's own job could tag an expense with tenant B's real vendor_id
 * (guessed, leaked elsewhere, or brute-forced -- these are plain uuid PKs,
 * no per-tenant namespacing). GET's own select embeds `vendors(id, name)` /
 * `service_types(id, name)` with no additional tenant filter (PostgREST
 * resolves the FK join regardless of tenant), so that foreign vendor's name
 * would render on tenant A's own job page. Proves the ownership check closes
 * this before any insert happens.
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
vi.mock('@/lib/require-permission', async () => {
  const actual = await vi.importActual<typeof import('@/lib/require-permission')>('@/lib/require-permission')
  return {
    ...actual,
    requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
  }
})
vi.mock('@/lib/entity', () => ({ getDefaultEntityId: async () => 'entity-1' }))
vi.mock('@/lib/jobs', () => ({ logJobEvent: async () => {} }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A = 'tenant-A'
const B = 'tenant-B'
const JOB_A = '00000000-0000-0000-0000-0000000000a1'
const VENDOR_A = '00000000-0000-0000-0000-0000000000a2'
const VENDOR_B = '00000000-0000-0000-0000-0000000000b2'
const SVC_A = '00000000-0000-0000-0000-0000000000a3'
const SVC_B = '00000000-0000-0000-0000-0000000000b3'
const LINE_A = '00000000-0000-0000-0000-0000000000a4'
const LINE_B = '00000000-0000-0000-0000-0000000000b4'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A
  fake._seed('jobs', [{ id: JOB_A, tenant_id: A }])
  fake._seed('vendors', [
    { id: VENDOR_A, tenant_id: A, name: 'Tenant A Supply Co' },
    { id: VENDOR_B, tenant_id: B, name: 'Tenant B Secret Vendor' },
  ])
  fake._seed('service_types', [
    { id: SVC_A, tenant_id: A, name: 'A Service', category_id: null },
    { id: SVC_B, tenant_id: B, name: 'B Service', category_id: null },
  ])
  fake._seed('budget_line_items', [
    { id: LINE_A, tenant_id: A, actual_cents: 0 },
    { id: LINE_B, tenant_id: B, actual_cents: 0 },
  ])
})

function post(body: unknown) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: JOB_A }),
  })
}

describe('POST /api/jobs/:id/expenses — cross-tenant reference isolation', () => {
  it("REJECTS a vendor_id belonging to another tenant, no expense row created", async () => {
    const res = await post({ category: 'materials', amount: 50, vendor_id: VENDOR_B })
    expect(res.status).toBe(400)
    expect(fake._all('expenses')).toHaveLength(0)
  })

  it("REJECTS a service_type_id belonging to another tenant", async () => {
    const res = await post({ category: 'materials', amount: 50, service_type_id: SVC_B })
    expect(res.status).toBe(400)
    expect(fake._all('expenses')).toHaveLength(0)
  })

  it("REJECTS a budget_line_item_id belonging to another tenant", async () => {
    const res = await post({ category: 'materials', amount: 50, budget_line_item_id: LINE_B })
    expect(res.status).toBe(400)
    expect(fake._all('expenses')).toHaveLength(0)
  })

  it("positive control: the SAME tenant's own vendor/service/budget-line ids are accepted", async () => {
    const res = await post({ category: 'materials', amount: 50, vendor_id: VENDOR_A, service_type_id: SVC_A, budget_line_item_id: LINE_A })
    expect(res.status).toBe(201)
    expect(fake._all('expenses')).toHaveLength(1)
  })
})
