import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * DELETE /api/admin/businesses/[id] must detach every domain attached to the
 * tenant from Vercel — not just tenants.domain/domain_name, but also any
 * extra tenant_domains rows added independently via /api/admin/websites
 * (which writes tenant_domains directly and never syncs tenants.domain).
 * Without this, a deleted tenant's extra domain stays attached to the shared
 * Vercel project forever.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const removeDomainCalls: string[] = []

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/vercel-domains', () => ({
  removeDomain: vi.fn(async (name: string) => {
    removeDomainCalls.push(name)
    return { ok: true, name, status: 'removed' as const }
  }),
}))

import { DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })

beforeEach(() => {
  h.seq = 0
  removeDomainCalls.length = 0
  h.store = {
    tenants: [
      { id: 'tenant-A', slug: 'acme-a', domain: 'acme-a.com', domain_name: null },
    ],
    tenant_domains: [
      { id: 'td-1', tenant_id: 'tenant-A', domain: 'acme-a.com' },
      { id: 'td-2', tenant_id: 'tenant-A', domain: 'extra-domain-added-via-admin-websites.com' },
    ],
    leads: [],
    partner_requests: [],
  }
})

describe('DELETE /api/admin/businesses/[id] — Vercel domain detach', () => {
  it('detaches the carrying domain, tenants.domain, and any extra tenant_domains row', async () => {
    const res = await DELETE(new Request('http://x'), { params: params('tenant-A') })
    expect(res.status).toBe(200)

    expect(removeDomainCalls).toContain('acme-a.fullloopcrm.com')
    expect(removeDomainCalls).toContain('acme-a.com')
    expect(removeDomainCalls).toContain('www.acme-a.com')
    expect(removeDomainCalls).toContain('extra-domain-added-via-admin-websites.com')
  })

  it('deduplicates domains that appear in both tenants.domain and tenant_domains', async () => {
    await DELETE(new Request('http://x'), { params: params('tenant-A') })
    const occurrences = removeDomainCalls.filter((d) => d === 'acme-a.com').length
    expect(occurrences).toBe(1)
  })
})
