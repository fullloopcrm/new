import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant isolation — PUT /api/budget-templates/[id].
 *
 * body.line_items' service_type_id/category_id went straight into the
 * budget_template_line_items insert with no ownership check -- a caller in
 * tenant A's own template could tag a line item with tenant B's real
 * service_type_id/category_id (plain uuid PKs, no per-tenant namespacing,
 * no composite/cross-tenant FK constraint at the DB level). Same class as
 * the job-expenses/quote-budgets/equipment-bookings fixes already landed
 * this session -- this route's sibling, apply-to-quote, avoids the bug
 * entirely by re-deriving these ids server-side from an already-verified
 * template instead of trusting the request body.
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

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const A = 'tenant-A'
const B = 'tenant-B'
const TEMPLATE_A = '00000000-0000-0000-0000-0000000000a1'
const SVC_A = '00000000-0000-0000-0000-0000000000a2'
const SVC_B = '00000000-0000-0000-0000-0000000000b2'
const CAT_A = '00000000-0000-0000-0000-0000000000a3'
const CAT_B = '00000000-0000-0000-0000-0000000000b3'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A
  fake._seed('budget_templates', [{ id: TEMPLATE_A, tenant_id: A, name: 'Standard Job', target_margin_bps: 3000, active: true, created_at: '2026-01-01' }])
  fake._seed('service_types', [
    { id: SVC_A, tenant_id: A, name: 'A Service' },
    { id: SVC_B, tenant_id: B, name: 'B Secret Service' },
  ])
  fake._seed('categories', [
    { id: CAT_A, tenant_id: A, name: 'A Category' },
    { id: CAT_B, tenant_id: B, name: 'B Secret Category' },
  ])
})

function put(body: unknown) {
  return PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: TEMPLATE_A }),
  })
}

describe('PUT /api/budget-templates/[id] — cross-tenant reference isolation', () => {
  it('REJECTS a line item whose service_type_id belongs to another tenant, no line item rows written', async () => {
    const res = await put({ line_items: [{ label: 'Labor', kind: 'labor', service_type_id: SVC_B }] })
    expect(res.status).toBe(400)
    expect(fake._all('budget_template_line_items')).toHaveLength(0)
  })

  it('REJECTS a line item whose category_id belongs to another tenant', async () => {
    const res = await put({ line_items: [{ label: 'Materials', kind: 'materials', category_id: CAT_B }] })
    expect(res.status).toBe(400)
    expect(fake._all('budget_template_line_items')).toHaveLength(0)
  })

  it("positive control: the SAME tenant's own service_type_id/category_id are accepted", async () => {
    const res = await put({ line_items: [{ label: 'Labor', kind: 'labor', service_type_id: SVC_A, category_id: CAT_A }] })
    expect(res.status).toBe(200)
    expect(fake._all('budget_template_line_items')).toHaveLength(1)
  })

  it('a line item with no service_type_id/category_id at all is still accepted (both optional)', async () => {
    const res = await put({ line_items: [{ label: 'Misc', kind: 'other' }] })
    expect(res.status).toBe(200)
    expect(fake._all('budget_template_line_items')).toHaveLength(1)
  })
})
