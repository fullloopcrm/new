import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fresh-ground — resolveOrigin() (site-readiness.ts) is the origin resolver
 * that drives checkSiteReadiness()'s real HTTP content/SEO audits (fetches
 * the tenant's OWN rendered pages) for the admin readiness dashboard
 * (admin/businesses/[id]/readiness). Same bug class as NOTICED #26/#29/the
 * client-sms brand fix: read tenant.domain/domain_name only and never
 * consulted tenant_domains. A tenant whose custom domain lives only in
 * tenant_domains (added via admin/websites) fell through to the
 * `<slug>.fullloopcrm.com` platform subdomain here — the admin readiness
 * audit fetched and reported on the wrong origin instead of the tenant's
 * real live site.
 */

type Eqs = Record<string, unknown>
let resolveTenantDomains: (eqs: Eqs) => { data: unknown; error?: unknown }

function from(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    // getPrimaryTenantDomain() now chains .order() before its bare .eq()
    // terminal — a no-op pass-through here since resolveTenantDomains
    // controls the returned data directly; the chain itself stays the
    // thenable that resolves it.
    order: () => chain,
    then: (onFulfilled: (v: { data: unknown; error?: unknown }) => unknown) =>
      Promise.resolve(table === 'tenant_domains' ? resolveTenantDomains(eqs) : { data: null }).then(onFulfilled),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from },
  supabase: { from },
}))

import { resolveOrigin } from './site-readiness'

beforeEach(() => {
  resolveTenantDomains = () => ({ data: [] })
})

describe('resolveOrigin domain resolution (fresh-ground, mirrors tenantBrand/tenantSiteUrl precedence)', () => {
  it('prefers the tenant_domains PRIMARY row over the legacy tenants.domain column', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-1'
        ? { data: [{ domain: 'alias.ace.com', is_primary: false }, { domain: 'ace.com', is_primary: true }] }
        : { data: [] }
    const origin = await resolveOrigin({ id: 't-1', slug: 'ace', domain: 'legacy-ace.com' })
    expect(origin).toBe('https://ace.com')
  })

  it('falls back to tenants.domain when the tenant has no tenant_domains rows', async () => {
    const origin = await resolveOrigin({ id: 't-2', slug: 'ace', domain: 'legacy-ace.com' })
    expect(origin).toBe('https://legacy-ace.com')
  })

  it('BUG-CLASS PROBE: domain only in tenant_domains previously fell through to the slug subdomain instead', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-3' ? { data: [{ domain: 'onlyintenantdomains.com', is_primary: true }] } : { data: [] }
    const origin = await resolveOrigin({ id: 't-3', slug: 'ace', domain: null, domain_name: null })
    expect(origin).toBe('https://onlyintenantdomains.com')
    expect(origin).not.toContain('fullloopcrm.com')
  })

  it('falls back to the slug subdomain when neither tenant_domains nor tenants.domain/domain_name resolves', async () => {
    const origin = await resolveOrigin({ id: 't-4', slug: 'ace', domain: null, domain_name: null })
    expect(origin).toBe('https://ace.fullloopcrm.com')
  })

  it('returns null when nothing resolves anywhere (no domain, no slug)', async () => {
    const origin = await resolveOrigin({ id: 't-5', slug: null, domain: null, domain_name: null })
    expect(origin).toBeNull()
  })

  it('WRONG-TENANT PROBE: a different tenant\'s tenant_domains PRIMARY row never leaks into this tenant\'s origin', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-6' ? { data: [] } : { data: [{ domain: 'other-tenants-domain.com', is_primary: true }] }
    const origin = await resolveOrigin({ id: 't-6', slug: 'ace', domain: null, domain_name: null })
    expect(origin).not.toContain('other-tenants-domain.com')
    expect(origin).toBe('https://ace.fullloopcrm.com')
  })

  it('skips the tenant_domains lookup entirely when the tenant has no id, falling straight through to the legacy columns', async () => {
    const origin = await resolveOrigin({ slug: 'ace', domain: 'legacy-ace.com' })
    expect(origin).toBe('https://legacy-ace.com')
  })

  it('BUG PROBE: strips a leftover "www." from a legacy tenants.domain row instead of fetching it literally', async () => {
    // Pre-fix admin writes (before the www-order normalization fix in
    // admin/businesses POST) could persist "www.acme.com" literally into
    // tenants.domain. `.replace(/^www\./, 'www.')` was a no-op -- it replaced
    // "www." with the identical string "www.", so this legacy row was
    // fetched as "https://www.legacy-ace.com" instead of the resolver's own
    // normalized "https://legacy-ace.com".
    const origin = await resolveOrigin({ id: 't-7', slug: 'ace', domain: 'www.legacy-ace.com' })
    expect(origin).toBe('https://legacy-ace.com')
  })

  it('strips "www." case-insensitively (mixed-case legacy row)', async () => {
    const origin = await resolveOrigin({ id: 't-8', slug: 'ace', domain: 'WWW.Legacy-Ace.com' })
    expect(origin).toBe('https://legacy-ace.com')
  })

  it('leaves a bare domain (no www. prefix) unchanged', async () => {
    const origin = await resolveOrigin({ id: 't-9', slug: 'ace', domain: 'legacy-ace.com' })
    expect(origin).toBe('https://legacy-ace.com')
  })
})
