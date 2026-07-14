import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/businesses/[id]/site-export — tenantDb() conversion
 * wrong-tenant probe (P1/W1 queue-a). Domain lookup is now scoped through
 * tenantDb(id) — verifies exporting tenant A's site can never resolve to
 * tenant B's domain.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))

const exportSiteToZip = vi.hoisted(() => vi.fn())
vi.mock('@/lib/site-export', () => ({ exportSiteToZip }))

import { GET } from './route'

const params = (id: string) => Promise.resolve({ id })

beforeEach(() => {
  h.seq = 0
  exportSiteToZip.mockReset()
  exportSiteToZip.mockResolvedValue({ zip: Buffer.from('zip'), pages: 1, assets: 0, capped: false })
  h.store = {
    tenant_domains: [
      { id: 'd-A1', tenant_id: 'tenant-A', domain: 'a.example.com', is_primary: true, active: true },
      { id: 'd-B1', tenant_id: 'tenant-B', domain: 'b.example.com', is_primary: true, active: true },
    ],
  }
})

describe('GET /api/admin/businesses/[id]/site-export — tenant isolation', () => {
  it("exporting tenant A resolves only A's domain, never B's", async () => {
    await GET(new Request('http://x'), { params: params('tenant-A') })
    expect(exportSiteToZip).toHaveBeenCalledWith('https://a.example.com')
  })

  it("exporting tenant B resolves only B's domain", async () => {
    await GET(new Request('http://x'), { params: params('tenant-B') })
    expect(exportSiteToZip).toHaveBeenCalledWith('https://b.example.com')
  })

  it('a tenant with no active domain gets a 400, not another tenant\'s domain', async () => {
    h.store.tenant_domains.push({ id: 'd-C1', tenant_id: 'tenant-C', domain: 'c.example.com', is_primary: true, active: false })
    const res = await GET(new Request('http://x'), { params: params('tenant-C') })
    expect(res.status).toBe(400)
    expect(exportSiteToZip).not.toHaveBeenCalled()
  })
})
