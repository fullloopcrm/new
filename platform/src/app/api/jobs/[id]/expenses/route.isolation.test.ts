import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant isolation — POST /api/jobs/[id]/expenses.
 *
 * vendor_id/service_type_id/budget_line_item_id (2026_07_21_expenses_fk_wiring.sql)
 * went straight from the request body into the insert with no ownership
 * check. Same class as the catalog-materials/budget-templates fixes this
 * session -- these are plain uuid PKs with no per-tenant namespacing. This
 * file's own GET embeds vendors(name)/service_types(name)/categories(name)
 * with no additional tenant filter, so a foreign id here is an ACTIVE
 * read-leak, not just write-pollution.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId = 'tenant-A'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: currentTenantId, tenant: { id: currentTenantId }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A = 'tenant-A'
const B = 'tenant-B'
const JOB_A = 'job-a1'
const VENDOR_A = '00000000-0000-0000-0000-0000000000a1'
const VENDOR_B = '00000000-0000-0000-0000-0000000000b1'
const SVC_A = '00000000-0000-0000-0000-0000000000a2'
const SVC_B = '00000000-0000-0000-0000-0000000000b2'
const LINE_A = '00000000-0000-0000-0000-0000000000a3'
const LINE_B = '00000000-0000-0000-0000-0000000000b3'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A
  fake._seed('jobs', [{ id: JOB_A, tenant_id: A }])
  fake._seed('vendors', [
    { id: VENDOR_A, tenant_id: A, name: 'A Vendor' },
    { id: VENDOR_B, tenant_id: B, name: 'B Secret Vendor' },
  ])
  fake._seed('service_types', [
    { id: SVC_A, tenant_id: A, name: 'A Service', category_id: null },
    { id: SVC_B, tenant_id: B, name: 'B Secret Service', category_id: null },
  ])
  fake._seed('budget_line_items', [
    { id: LINE_A, tenant_id: A, actual_cents: 0 },
    { id: LINE_B, tenant_id: B, actual_cents: 0 },
  ])
})

function post(jobId: string, body: unknown) {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: jobId }),
  })
}

describe('POST /api/jobs/[id]/expenses — cross-tenant reference isolation', () => {
  it('REJECTS a vendor_id belonging to another tenant, no expense row created', async () => {
    const res = await post(JOB_A, { category: 'materials', amount: 50, vendor_id: VENDOR_B })
    expect(res.status).toBe(400)
    expect(fake._all('expenses')).toHaveLength(0)
  })

  it('REJECTS a service_type_id belonging to another tenant, no expense row created', async () => {
    const res = await post(JOB_A, { category: 'materials', amount: 50, service_type_id: SVC_B })
    expect(res.status).toBe(400)
    expect(fake._all('expenses')).toHaveLength(0)
  })

  it('REJECTS a budget_line_item_id belonging to another tenant, no expense row created', async () => {
    const res = await post(JOB_A, { category: 'materials', amount: 50, budget_line_item_id: LINE_B })
    expect(res.status).toBe(400)
    expect(fake._all('expenses')).toHaveLength(0)
  })

  it("positive control: the SAME tenant's own vendor/service_type/budget_line ids are accepted", async () => {
    const res = await post(JOB_A, {
      category: 'materials', amount: 50, vendor_id: VENDOR_A, service_type_id: SVC_A, budget_line_item_id: LINE_A,
    })
    expect(res.status).toBe(201)
    expect(fake._all('expenses')).toHaveLength(1)
  })
})
