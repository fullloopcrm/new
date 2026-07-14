import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/reviews — tenantDb() conversion wrong-tenant probe (P1/W1
 * backlog batch). GET/PUT/DELETE previously carried their own manual
 * `.eq('tenant_id', tenant.tenantId)`; that filter now comes solely from the
 * wrapper — this proves a crafted review id belonging to another tenant can
 * never be listed, edited, or deleted by an admin authenticated for a
 * different tenant.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { GET, PUT, DELETE } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    reviews: [
      { id: 'rev-A1', tenant_id: 'tenant-A', status: 'pending', featured: false },
      { id: 'rev-B1', tenant_id: 'tenant-B', status: 'pending', featured: false },
    ],
  }
})

const putReq = (body: unknown) => new NextRequest('http://x', { method: 'PUT', body: JSON.stringify(body) })
const delReq = (body: unknown) => new NextRequest('http://x', { method: 'DELETE', body: JSON.stringify(body) })

describe('/api/admin/reviews — tenant isolation', () => {
  it("GET for tenant A never returns tenant B's review", async () => {
    const res = await GET()
    const json = await res.json()
    const ids = (json.reviews as Array<{ id: string }>).map((r) => r.id)
    expect(ids).toContain('rev-A1')
    expect(ids).not.toContain('rev-B1')
  })

  it("PUT targeting tenant B's review id (while authed as tenant A) never approves it", async () => {
    const res = await PUT(putReq({ id: 'rev-B1', status: 'approved' }))
    expect(res.status).toBe(200)

    const revB = h.store.reviews.find((r) => r.id === 'rev-B1')
    expect(revB?.status).toBe('pending')
  })

  it("DELETE targeting tenant B's review id (while authed as tenant A) never removes it", async () => {
    const res = await DELETE(delReq({ id: 'rev-B1' }))
    expect(res.status).toBe(200)

    const stillThere = h.store.reviews.some((r) => r.id === 'rev-B1')
    expect(stillThere).toBe(true)
  })

  it("PUT targeting tenant A's own review id does approve it", async () => {
    await PUT(putReq({ id: 'rev-A1', status: 'approved' }))
    const revA = h.store.reviews.find((r) => r.id === 'rev-A1')
    expect(revA?.status).toBe('approved')
  })
})
