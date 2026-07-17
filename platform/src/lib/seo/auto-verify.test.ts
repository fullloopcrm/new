import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * auto-verify.ts's eligibleForAutoVerify() -- the allowlist gate for
 * SEOMGR_AUTOVERIFY_ENABLED: only properties that are awaiting_grant AND
 * resolve to an active tenant domain are ever eligible. Mocks supabaseAdmin
 * against seo_properties, tenant_domains, and tenants, mirroring
 * onboarding.test.ts's inline chain-builder pattern.
 */

type TenantDomainRow = { domain: string }
type TenantRow = { domain: string | null }
type SeoPropertyRow = {
  property: string
  domain: string | null
  tenant_id: string | null
  permission: unknown
  meta: { gsc_status?: string } | null
}

let seoPropertyRows: SeoPropertyRow[]
let tenantDomainRows: TenantDomainRow[]
let tenantRows: TenantRow[]

function builder(table: string) {
  const eq: Record<string, unknown> = {}
  let notNullCol: string | undefined

  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eq[col] = val; return chain },
    not: (col: string, _op: string, _val: unknown) => { notNullCol = col; return chain },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'seo_properties') {
        resolve({ data: seoPropertyRows, error: null })
        return
      }
      if (table === 'tenant_domains') {
        resolve({ data: tenantDomainRows, error: null })
        return
      }
      if (table === 'tenants') {
        if (notNullCol === 'domain') {
          resolve({ data: tenantRows.filter((t) => t.domain != null), error: null })
          return
        }
        resolve({ data: [], error: null })
        return
      }
      resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { eligibleForAutoVerify } from './auto-verify'

function prop(over: Partial<SeoPropertyRow>): SeoPropertyRow {
  return {
    property: 'sc-domain:acme.com',
    domain: 'acme.com',
    tenant_id: 't1',
    permission: null,
    meta: { gsc_status: 'awaiting_grant' },
    ...over,
  }
}

beforeEach(() => {
  seoPropertyRows = []
  tenantDomainRows = []
  tenantRows = []
})

describe('eligibleForAutoVerify()', () => {
  it('is eligible when the domain has an active tenant_domains row', async () => {
    tenantDomainRows = [{ domain: 'acme.com' }]
    seoPropertyRows = [prop({ domain: 'acme.com', property: 'sc-domain:acme.com' })]

    const out = await eligibleForAutoVerify()

    expect(out.map((e) => e.domain)).toEqual(['acme.com'])
  })

  it('FALLBACK PROBE: falls back to tenants.domain when no active tenant_domains row exists (coverage gap regression)', async () => {
    // tenant_domains registration is best-effort (activate-tenant.ts's upsert
    // is try/catch, "never blocks" activation) -- a tenant live only via
    // legacy tenants.domain has zero tenant_domains rows. Before the fallback
    // fix, this property could NEVER auto-verify even with the flag enabled.
    tenantDomainRows = []
    tenantRows = [{ domain: 'legacyco.com' }]
    seoPropertyRows = [prop({ domain: 'legacyco.com', property: 'sc-domain:legacyco.com', tenant_id: 't2' })]

    const out = await eligibleForAutoVerify()

    expect(out.map((e) => e.domain)).toEqual(['legacyco.com'])
  })

  it('WRONG-TENANT PROBE: a legacy tenants.domain row for a different host does not make an unrelated property eligible', async () => {
    tenantDomainRows = []
    tenantRows = [{ domain: 'other-tenant.com' }]
    seoPropertyRows = [prop({ domain: 'not-covered.com', property: 'sc-domain:not-covered.com', tenant_id: 't3' })]

    const out = await eligibleForAutoVerify()

    expect(out).toHaveLength(0)
  })

  it('still excludes a property that is not awaiting_grant even once the domain resolves via fallback', async () => {
    tenantDomainRows = []
    tenantRows = [{ domain: 'legacyco.com' }]
    seoPropertyRows = [prop({ domain: 'legacyco.com', meta: { gsc_status: 'verified' } })]

    const out = await eligibleForAutoVerify()

    expect(out).toHaveLength(0)
  })

  it('excludes nothing extra when neither source covers the domain (still not eligible)', async () => {
    tenantDomainRows = []
    tenantRows = []
    seoPropertyRows = [prop({ domain: 'unregistered.com', property: 'sc-domain:unregistered.com' })]

    const out = await eligibleForAutoVerify()

    expect(out).toHaveLength(0)
  })
})
