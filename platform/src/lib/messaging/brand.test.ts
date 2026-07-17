import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fresh-ground — tenantBrand() (client-facing SMS/email brand strings) read
 * website_url/tenants.domain only and never consulted tenant_domains, same
 * bug class already fixed for tenantSiteUrl()/getAgentConfig()/
 * buildBrandOverride(). Unlike the SELENA agent case this one is LIVE today:
 * clientSmsTemplates()/clientSmsTemplatesFor() (client-sms.ts) feed every
 * booking-confirmed/cancelled/rescheduled/rebook SMS and the rating-prompt
 * cron for every cleaning-industry tenant. A tenant whose custom domain
 * lives only in tenant_domains (added via admin/websites, which never
 * touches tenants.domain or website_url) got an empty `site` (dropping the
 * "tap to confirm" link) and the literal string "the booking link we sent
 * you" instead of a real bookUrl.
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

vi.mock('../supabase', () => ({
  supabaseAdmin: { from },
  supabase: { from },
}))

import { tenantBrand } from './brand'

beforeEach(() => {
  resolveTenantDomains = () => ({ data: [] })
})

describe('tenantBrand domain resolution (fresh-ground, mirrors getAgentConfig/buildBrandOverride precedence)', () => {
  it('prefers the tenant_domains PRIMARY row over the legacy tenants.domain column', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-1'
        ? { data: [{ domain: 'alias.ace.com', is_primary: false }, { domain: 'ace.com', is_primary: true }] }
        : { data: [] }
    const brand = await tenantBrand({ id: 't-1', name: 'Ace Cleaning', domain: 'legacy-ace.com' })
    expect(brand.site).toBe('ace.com')
    expect(brand.bookUrl).toBe('ace.com/book')
  })

  it('falls back to tenants.domain when the tenant has no tenant_domains rows', async () => {
    const brand = await tenantBrand({ id: 't-2', name: 'Ace Cleaning', domain: 'legacy-ace.com' })
    expect(brand.site).toBe('legacy-ace.com')
    expect(brand.bookUrl).toBe('legacy-ace.com/book')
  })

  it('falls back to website_url when neither tenant_domains nor tenants.domain resolves', async () => {
    const brand = await tenantBrand({ id: 't-3', name: 'Ace Cleaning', domain: null, website_url: 'https://ace-site.example/' })
    expect(brand.site).toBe('ace-site.example')
    expect(brand.bookUrl).toBe('ace-site.example/book')
  })

  it('BUG-CLASS PROBE: domain only in tenant_domains (no tenants.domain/website_url) previously degraded to a broken bookUrl', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-4' ? { data: [{ domain: 'onlyintenantdomains.com', is_primary: true }] } : { data: [] }
    const brand = await tenantBrand({ id: 't-4', name: 'Ace Cleaning', domain: null, website_url: null })
    expect(brand.site).toBe('onlyintenantdomains.com')
    expect(brand.bookUrl).toBe('onlyintenantdomains.com/book')
  })

  it('degrades to the placeholder bookUrl and empty site only when no domain resolves anywhere', async () => {
    const brand = await tenantBrand({ id: 't-5', name: 'Ace Cleaning', domain: null, website_url: null })
    expect(brand.site).toBe('')
    expect(brand.bookUrl).toBe('the booking link we sent you')
  })

  it('WRONG-TENANT PROBE: a different tenant\'s tenant_domains PRIMARY row never leaks into this tenant\'s brand', async () => {
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-6' ? { data: [] } : { data: [{ domain: 'other-tenants-domain.com', is_primary: true }] }
    const brand = await tenantBrand({ id: 't-6', name: 'Ace Cleaning', domain: null, website_url: null })
    expect(brand.site).not.toContain('other-tenants-domain.com')
    expect(brand.bookUrl).toBe('the booking link we sent you')
  })

  it('skips the tenant_domains lookup entirely when the tenant has no id, falling straight through to the legacy columns', async () => {
    const brand = await tenantBrand({ name: 'Ace Cleaning', domain: 'legacy-ace.com' })
    expect(brand.site).toBe('legacy-ace.com')
  })
})
