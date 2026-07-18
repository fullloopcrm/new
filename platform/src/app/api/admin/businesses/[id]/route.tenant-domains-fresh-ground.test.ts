import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET + DELETE /api/admin/businesses/[id] — two stacked tenant_domains gaps,
 * both fresh ground (this route's resolver-precedence surface was not
 * previously audited; only its `domain` normalization on PUT was).
 *
 * BUG 1 (GET, checklist.website.custom_domain_live): checked
 * `business.domain_name` alone — the registrar/display field this route's
 * own PUT-handler comment documents as "NOT what the resolver queries."
 * tenant_domains (the P1 primary source — admin/websites' recommended
 * add-a-domain flow writes ONLY here) was never consulted, and not even
 * `tenants.domain` (the actual resolver-fallback field) was checked. A
 * tenant onboarded the recommended way showed "Custom domain live: false"
 * forever, even with DNS + website both genuinely live.
 *
 * BUG 2 (DELETE, Vercel domain detach): read only `tenants.domain` /
 * `tenants.domain_name` before detaching the tenant's domains from Vercel.
 * tenant_domains rows are ON DELETE CASCADE (migrations/043_tenant_domains.sql)
 * — gone from the DB the instant the tenants row is deleted — and were never
 * read out first, so a domain owned only through tenant_domains (again, the
 * common case for anything added via admin/websites) stayed attached to the
 * Vercel project forever after its tenant was deleted.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const removeDomainSpy = vi.hoisted(() => vi.fn(async (name: string) => ({ ok: true, name, status: 'removed' as const })))
vi.mock('@/lib/vercel-domains', () => ({ removeDomain: removeDomainSpy }))

import { GET, DELETE } from './route'

function baseTenant(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, slug: id, name: id, admin_seats: 1, team_seats: 0,
    domain: null, domain_name: null, dns_configured: true, website_published: true,
    setup_progress: {}, ...overrides,
  }
}

function seed() {
  return {
    tenants: [baseTenant(TENANT_A), baseTenant(TENANT_B)] as Record<string, unknown>[],
    tenant_members: [],
    tenant_invites: [],
    clients: [],
    bookings: [],
    team_members: [],
    tenant_domains: [] as Record<string, unknown>[],
    leads: [],
    partner_requests: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  removeDomainSpy.mockClear()
})

function get(id: string) {
  return GET(new Request(`http://t/api/admin/businesses/${id}`), { params: Promise.resolve({ id }) })
}

function del(id: string) {
  return DELETE(new Request(`http://t/api/admin/businesses/${id}`, { method: 'DELETE' }), { params: Promise.resolve({ id }) })
}

describe('GET /api/admin/businesses/[id] — custom_domain_live consults tenant_domains', () => {
  it('BUG (fixed): tenant_domains has the only live domain, tenants.domain/domain_name are both null — custom_domain_live is still true', async () => {
    h.seed.tenant_domains.push({ id: 'd1', tenant_id: TENANT_A, domain: 'acme.com', active: true, is_primary: true, created_at: '2026-01-01' })
    const res = await get(TENANT_A)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.checklist.website.custom_domain_live).toBe(true)
  })

  it('legacy fallback still works: tenants.domain is set, no tenant_domains row at all', async () => {
    const t = (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)!
    t.domain = 'legacy-acme.com'
    const res = await get(TENANT_A)
    const body = await res.json()
    expect(body.checklist.website.custom_domain_live).toBe(true)
  })

  it('neither tenant_domains nor tenants.domain resolves anything — custom_domain_live is false even though dns/website flags are on', async () => {
    const res = await get(TENANT_A)
    const body = await res.json()
    expect(body.checklist.website.custom_domain_live).toBe(false)
  })

  it('domain_purchased is unaffected by this fix — still reads domain_name (the registrar-tracking field), unchanged behavior', async () => {
    const t = (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)!
    t.domain_name = 'acme.com'
    const res = await get(TENANT_A)
    const body = await res.json()
    expect(body.checklist.accounts.domain_purchased).toBe(true)
  })

  it('WRONG-TENANT PROBE: tenant B has a live tenant_domains row, tenant A does not — A never inherits B\'s resolved domain', async () => {
    h.seed.tenant_domains.push({ id: 'd2', tenant_id: TENANT_B, domain: 'bravo.com', active: true, is_primary: true, created_at: '2026-01-01' })
    const res = await get(TENANT_A)
    const body = await res.json()
    expect(body.checklist.website.custom_domain_live).toBe(false)
  })
})

describe('DELETE /api/admin/businesses/[id] — detaches tenant_domains-only domains from Vercel', () => {
  it('BUG (fixed): a domain that lives ONLY in tenant_domains (never touched tenants.domain/domain_name) is still detached from Vercel', async () => {
    h.seed.tenant_domains.push({ id: 'd1', tenant_id: TENANT_A, domain: 'acme.com', active: true, is_primary: true, created_at: '2026-01-01' })
    const res = await del(TENANT_A)
    expect(res.status).toBe(200)
    const calledWith = removeDomainSpy.mock.calls.map((c) => c[0])
    expect(calledWith).toContain('acme.com')
    expect(calledWith).toContain('www.acme.com')
    expect(calledWith).toContain(`${TENANT_A}.fullloopcrm.com`)
  })

  it('detaches BOTH a legacy tenants.domain and a separate tenant_domains alias, with no duplicates', async () => {
    const t = (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)!
    t.domain = 'legacy-acme.com'
    h.seed.tenant_domains.push({ id: 'd1', tenant_id: TENANT_A, domain: 'alias-acme.com', active: true, is_primary: false, created_at: '2026-01-01' })
    const res = await del(TENANT_A)
    expect(res.status).toBe(200)
    const calledWith = removeDomainSpy.mock.calls.map((c) => c[0])
    expect(calledWith).toContain('legacy-acme.com')
    expect(calledWith).toContain('alias-acme.com')
    expect(calledWith.length).toBe(new Set(calledWith).size)
  })

  it('WRONG-TENANT PROBE: deleting tenant A never detaches tenant B\'s tenant_domains-only domain', async () => {
    h.seed.tenant_domains.push({ id: 'd2', tenant_id: TENANT_B, domain: 'bravo.com', active: true, is_primary: true, created_at: '2026-01-01' })
    await del(TENANT_A)
    const calledWith = removeDomainSpy.mock.calls.map((c) => c[0])
    expect(calledWith).not.toContain('bravo.com')
    expect(calledWith).not.toContain('www.bravo.com')
  })
})
