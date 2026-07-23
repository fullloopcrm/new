import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * IDOR probe -- vendors/[id]/items/route.ts. Same bug class already fixed
 * elsewhere in this sweep (jobs/[id]/expenses, quote-budgets): plain-uuid
 * FKs with no per-tenant composite constraint at the DB level mean POST
 * accepted a cross-tenant `id` (vendor, from the URL) or `inventory_item_id`
 * (from the body) with no ownership check -- tenantDb() only auto-stamps
 * tenant_id on the vendor_items row itself, it does not validate that the
 * referenced vendor/item actually belong to the caller. GET's own select
 * embeds inventory_items(name, unit_label) with no tenant filter on the
 * join (service_role bypasses RLS), so a cross-tenant link is a real
 * read-leak of another tenant's real catalog item name, not just dead data.
 */

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: TENANT_A, tenant: { id: TENANT_A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('vendors', [
    { id: 'vendor-a', tenant_id: TENANT_A, name: 'A Vendor' },
    { id: 'vendor-b', tenant_id: TENANT_B, name: 'B Vendor' },
  ])
  fake._seed('inventory_items', [
    { id: 'item-a', tenant_id: TENANT_A, name: 'A Widget', unit_label: 'unit' },
    { id: 'item-b', tenant_id: TENANT_B, name: 'B Secret Widget', unit_label: 'unit' },
  ])
  fake._seed('vendor_items', [])
})

describe('POST /api/vendors/[id]/items -- tenant ownership', () => {
  it('rejects a vendor_id belonging to another tenant', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ inventory_item_id: 'item-a' }) })
    const res = await POST(req, paramsFor('vendor-b'))
    expect(res.status).toBe(400)
    expect(fake._all('vendor_items')).toHaveLength(0)
  })

  it('rejects an inventory_item_id belonging to another tenant', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ inventory_item_id: 'item-b' }) })
    const res = await POST(req, paramsFor('vendor-a'))
    expect(res.status).toBe(400)
    expect(fake._all('vendor_items')).toHaveLength(0)
  })

  it('accepts same-tenant vendor + item (positive control)', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ inventory_item_id: 'item-a', unit_cost_cents: 500 }) })
    const res = await POST(req, paramsFor('vendor-a'))
    expect(res.status).toBe(200)
    const rows = fake._all('vendor_items')
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe(TENANT_A)
  })
})
