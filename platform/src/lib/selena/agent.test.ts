import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * buildBrandOverride()/applyBrandRewrite() (agent.ts) both read tenant.domain
 * directly — the legacy tenants.domain column — and never consulted
 * tenant_domains at all, unlike tenantSiteUrl()/getAgentConfig() which were
 * already fixed to prefer the tenant_domains PRIMARY row (mirror of NOTICED
 * #26's bug class). Currently dark for non-nycmaid live traffic (only nycmaid
 * routes through the new SELENA agent today, per the leader's Q4 cutover
 * note, and nycmaid early-returns before any domain resolution runs) — but a
 * landmine: the moment a non-nycmaid tenant cuts over, applyBrandRewrite()'s
 * `if (domain) out = out.replace(/thenycmaid\.com/gi, domain)` would silently
 * no-op for any tenant whose only domain lives in tenant_domains, leaving the
 * literal wrong-brand "thenycmaid.com" in text sent to that tenant's own
 * customers. 0 tests existed for either function before this file (both were
 * private/unexported) — exported here for direct testability, same pattern
 * already used for isOwner/normalizePhoneDigits/buildCtxBlock in this file.
 */

type Eqs = Record<string, unknown>
let tenantRow: Record<string, unknown> | null
let resolveTenantDomains: (eqs: Eqs) => { data: unknown; error?: unknown }

function from(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => ({ data: table === 'tenants' ? tenantRow : null, error: null }),
    // getPrimaryTenantDomain() (tenant_domains) ends on a bare .eq() chain —
    // no .single(). It now also chains .order() first — a no-op pass-through
    // here since resolveTenantDomains controls the returned data directly.
    order: () => chain,
    then: (onFulfilled: (v: { data: unknown; error?: unknown }) => unknown) =>
      Promise.resolve(table === 'tenant_domains' ? resolveTenantDomains(eqs) : { data: null }).then(onFulfilled),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from },
  supabase: { from },
}))

import { buildBrandOverride, applyBrandRewrite } from './agent'

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

beforeEach(() => {
  tenantRow = null
  resolveTenantDomains = () => ({ data: [] })
})

describe('buildBrandOverride domain resolution', () => {
  it('returns empty immediately for nycmaid, never queries the tenant row', async () => {
    let queried = false
    tenantRow = null
    resolveTenantDomains = () => { queried = true; return { data: [] } }
    const result = await buildBrandOverride(NYCMAID_TENANT_ID)
    expect(result).toBe('')
    expect(queried).toBe(false)
  })

  it('prefers the tenant_domains PRIMARY row over the legacy tenants.domain column', async () => {
    tenantRow = { id: 't-1', name: 'Ace Pest', domain: 'legacy-ace.com', website_url: null }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-1' ? { data: [{ domain: 'alias.ace.com', is_primary: false }, { domain: 'ace.com', is_primary: true }] } : { data: [] }
    const result = await buildBrandOverride('t-1')
    expect(result).toContain('"ace.com"')
    expect(result).not.toContain('legacy-ace.com')
    expect(result).toContain('"https://ace.com/portal"')
  })

  it('falls back to tenants.domain when the tenant has no tenant_domains rows', async () => {
    tenantRow = { id: 't-2', name: 'Ace Pest', domain: 'legacy-ace.com', website_url: null }
    const result = await buildBrandOverride('t-2')
    expect(result).toContain('"legacy-ace.com"')
  })

  it('falls back to "<not configured>" when no domain resolves anywhere', async () => {
    tenantRow = { id: 't-3', name: 'Ace Pest', domain: null, website_url: null }
    const result = await buildBrandOverride('t-3')
    expect(result).toContain('"<not configured>"')
  })

  it('WRONG-TENANT PROBE: a different tenant\'s tenant_domains PRIMARY row never leaks into this tenant\'s override', async () => {
    tenantRow = { id: 't-4', name: 'Ace Pest', domain: null, website_url: null }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-4' ? { data: [] } : { data: [{ domain: 'other-tenants-domain.com', is_primary: true }] }
    const result = await buildBrandOverride('t-4')
    expect(result).not.toContain('other-tenants-domain.com')
    expect(result).toContain('"<not configured>"')
  })
})

describe('applyBrandRewrite domain resolution', () => {
  it('returns text unchanged immediately for nycmaid, never queries the tenant row', async () => {
    let queried = false
    resolveTenantDomains = () => { queried = true; return { data: [] } }
    const result = await applyBrandRewrite('visit thenycmaid.com', NYCMAID_TENANT_ID)
    expect(result).toBe('visit thenycmaid.com')
    expect(queried).toBe(false)
  })

  it('rewrites thenycmaid.com to the tenant_domains PRIMARY domain, not the legacy tenants.domain column', async () => {
    tenantRow = { name: 'Ace Pest', domain: 'legacy-ace.com', website_url: null, email: null, phone: null, agent_name: null }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-1' ? { data: [{ domain: 'ace.com', is_primary: true }] } : { data: [] }
    const result = await applyBrandRewrite('Check us out at thenycmaid.com/portal for updates.', 't-1')
    expect(result).toBe('Check us out at ace.com/portal for updates.')
  })

  it('BUG-CLASS PROBE: without the tenant_domains fallback this would leak thenycmaid.com — falls back to tenants.domain when tenant_domains is empty, so it never leaks', async () => {
    tenantRow = { name: 'Ace Pest', domain: 'legacy-ace.com', website_url: null, email: null, phone: null, agent_name: null }
    const result = await applyBrandRewrite('Visit thenycmaid.com today.', 't-2')
    expect(result).toBe('Visit legacy-ace.com today.')
    expect(result).not.toContain('thenycmaid.com')
  })

  it('WRONG-TENANT PROBE: a different tenant\'s tenant_domains PRIMARY row never leaks into this tenant\'s rewrite', async () => {
    tenantRow = { name: 'Ace Pest', domain: null, website_url: null, email: null, phone: null, agent_name: null }
    resolveTenantDomains = (eqs) =>
      eqs.tenant_id === 't-3' ? { data: [] } : { data: [{ domain: 'other-tenants-domain.com', is_primary: true }] }
    const result = await applyBrandRewrite('Visit thenycmaid.com today.', 't-3')
    expect(result).not.toContain('other-tenants-domain.com')
    // No domain resolves anywhere for t-3, so the replace() is skipped and the
    // literal template string passes through untouched — that gap is the
    // pre-existing, separately-flagged landmine (see file header), not what
    // this probe covers. What matters here: it's never the WRONG tenant's domain.
    expect(result).toBe('Visit thenycmaid.com today.')
  })
})
