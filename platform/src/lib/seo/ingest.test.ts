import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * ingest.ts's linkTenant() — resolves a GSC property's bare domain to a
 * tenant_id for seo_properties.tenant_id. Mocks supabaseAdmin against
 * tenant_domains and tenants, mirroring backlinks.test.ts's inline
 * chain-builder pattern.
 */

type TenantDomainRow = { domain: string; tenant_id: string }
type TenantRow = { id: string; domain: string | null }

let tenantDomainRows: TenantDomainRow[]
let tenantRows: TenantRow[]

function builder(table: string) {
  const eq: Record<string, unknown> = {}

  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eq[col] = val; return chain },
    limit: () => chain,
    maybeSingle: async () => {
      if (table === 'tenant_domains') {
        const row = tenantDomainRows.find((r) => r.domain === eq.domain)
        return { data: row ? { tenant_id: row.tenant_id } : null, error: null }
      }
      if (table === 'tenants') {
        const row = tenantRows.find((t) => t.domain === eq.domain)
        return { data: row ? { id: row.id } : null, error: null }
      }
      return { data: null, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { linkTenant } from './ingest'

beforeEach(() => {
  tenantDomainRows = []
  tenantRows = []
})

describe('linkTenant()', () => {
  it('resolves via tenant_domains when an active row exists', async () => {
    tenantDomainRows = [{ domain: 'acme.com', tenant_id: 't1' }]

    expect(await linkTenant('acme.com')).toBe('t1')
  })

  it('falls back to tenants.domain when no tenant_domains row exists (coverage gap regression)', async () => {
    // tenant_domains registration is best-effort (activate-tenant.ts's upsert
    // is try/catch, "never blocks" activation) -- a tenant live only via
    // legacy tenants.domain has zero tenant_domains rows. Before the fallback
    // fix, every one of that tenant's GSC properties silently ingested with
    // tenant_id: null forever (Selena's handleSeoStatus() reads tenant_id).
    tenantDomainRows = []
    tenantRows = [{ id: 't2', domain: 'legacyco.com' }]

    expect(await linkTenant('legacyco.com')).toBe('t2')
  })

  it('prefers the tenant_domains entry over a DIFFERENT tenant\'s stale tenants.domain for the same host (wrong-tenant probe)', async () => {
    // t3 legitimately owns 'shared-host.com' via tenant_domains today; t9's
    // tenants.domain is a stale/unmigrated row that happens to share the
    // string. linkTenant must attribute to the tenant_domains owner (t3),
    // never fall through to the legacy row and cross-attribute to t9.
    tenantDomainRows = [{ domain: 'shared-host.com', tenant_id: 't3' }]
    tenantRows = [{ id: 't9', domain: 'shared-host.com' }]

    expect(await linkTenant('shared-host.com')).toBe('t3')
  })

  it('returns null when the domain is untracked by either source', async () => {
    tenantDomainRows = [{ domain: 'acme.com', tenant_id: 't1' }]
    tenantRows = [{ id: 't2', domain: 'legacyco.com' }]

    expect(await linkTenant('unknown-host.com')).toBeNull()
  })
})
