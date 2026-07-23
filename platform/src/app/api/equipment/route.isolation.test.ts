import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * IDOR probe -- equipment/route.ts. Same bug class already fixed elsewhere
 * this sweep (jobs/[id]/expenses, quote-budgets, vendors/[id]/items,
 * catalog): service_type_id/category_id are plain-uuid FKs (ON DELETE SET
 * NULL, no per-tenant composite constraint) that POST/PATCH wrote straight
 * from the request body with no ownership check.
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
import { POST, PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('service_types', [
    { id: 'svc-a', tenant_id: TENANT_A, name: 'A Service' },
    { id: 'svc-b', tenant_id: TENANT_B, name: 'B Service' },
  ])
  fake._seed('categories', [
    { id: 'cat-a', tenant_id: TENANT_A, name: 'A Category' },
    { id: 'cat-b', tenant_id: TENANT_B, name: 'B Category' },
  ])
  fake._seed('equipment', [])
})

describe('POST /api/equipment -- tenant ownership', () => {
  it('rejects a service_type_id belonging to another tenant', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Dumpster', service_type_id: 'svc-b' }) })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(fake._all('equipment')).toHaveLength(0)
  })

  it('rejects a category_id belonging to another tenant', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Dumpster', category_id: 'cat-b' }) })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(fake._all('equipment')).toHaveLength(0)
  })

  it('accepts same-tenant service_type_id + category_id (positive control)', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Dumpster', service_type_id: 'svc-a', category_id: 'cat-a' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const rows = fake._all('equipment')
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe(TENANT_A)
  })
})

describe('PATCH /api/equipment -- tenant ownership', () => {
  beforeEach(() => {
    fake._seed('equipment', [{ id: 'eq-a', tenant_id: TENANT_A, name: 'Existing', service_type_id: null, category_id: null }])
  })

  it('rejects a service_type_id belonging to another tenant, leaves the row unchanged', async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ id: 'eq-a', service_type_id: 'svc-b' }) })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(fake._all('equipment').find((r) => r.id === 'eq-a')!.service_type_id).toBe(null)
  })

  it('rejects a category_id belonging to another tenant, leaves the row unchanged', async () => {
    const req = new Request('http://x', { method: 'PATCH', body: JSON.stringify({ id: 'eq-a', category_id: 'cat-b' }) })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    expect(fake._all('equipment').find((r) => r.id === 'eq-a')!.category_id).toBe(null)
  })
})
