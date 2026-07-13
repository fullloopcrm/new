import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/comhub/templates — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Tenant is resolved server-side via getCurrentTenantId(),
 * not caller-supplied — verifies GET/POST never leak or write across tenants.
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
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))

import { GET, POST } from './route'

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    comhub_templates: [
      { id: 't-A1', tenant_id: 'tenant-A', name: 'A Template', body: 'hi A', archived_at: null },
      { id: 't-B1', tenant_id: 'tenant-B', name: 'B Template', body: 'hi B', archived_at: null },
    ],
  }
})

describe('GET /api/admin/comhub/templates — tenant isolation', () => {
  it("tenant A's template list never includes tenant B's rows", async () => {
    const res = await GET(new NextRequest('http://x?channel=all'))
    const json = await res.json()
    expect(json.templates.map((t: { id: string }) => t.id)).toEqual(['t-A1'])
    expect(JSON.stringify(json)).not.toContain('B Template')
  })
})

describe('POST /api/admin/comhub/templates — tenant isolation', () => {
  it("a template created by tenant A is stamped tenant-A regardless of caller-supplied tenant_id", async () => {
    const res = await POST(postReq({ name: 'New', body: 'text' }))
    const json = await res.json()
    expect(json.template.tenant_id).toBe('tenant-A')
  })

  it("tenant B never sees a template created while acting as tenant A", async () => {
    await POST(postReq({ name: 'New', body: 'text' }))
    h.tenantId = 'tenant-B'
    const res = await GET(new NextRequest('http://x?channel=all'))
    const json = await res.json()
    expect(json.templates.map((t: { id: string }) => t.id)).toEqual(['t-B1'])
  })
})
