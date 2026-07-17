import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * formatHtmlReply() (selena-legacy-email.ts) — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the reply-footer site link was built from `tenant.domain`
 * directly, never consulting `tenant_domains`. A tenant whose real custom
 * domain lives only in tenant_domains (the normal state — admin/websites
 * writes tenant_domains only, never tenants.domain) had its Selena email
 * reply footer link point at the wrong/absent host. Fixed by routing through
 * tenantSiteUrl() (tenant_domains first, tenants.domain fallback), same
 * precedence every other outbound tenant-branded surface uses.
 *
 * NOTE: handleInboundEmail() (this file's only export besides
 * formatHtmlReply) has zero callers anywhere in the app as of this probe —
 * confirmed via repo-wide grep. It was ported from nycmaid (f7dd9194) and
 * never wired to a live route; /api/email/monitor and its cron trigger
 * handle a different concern (Zelle/Venmo payment parsing) and never call
 * this module. This probe exercises formatHtmlReply() directly so the fix is
 * verified now and stays correct if/when the module is wired up.
 */

const TENANT_A = 'tid-selena-email-a'
const TENANT_B = 'tid-selena-email-b'

let tenantDomainsRows: Record<string, unknown>[] = []

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let orderCol: string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      order: (col: string) => { orderCol = col; return chain },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (orderCol) hit = [...hit].sort((a, b) => String(a[orderCol as string]).localeCompare(String(b[orderCol as string])))
        resolve({ data: hit, error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { formatHtmlReply } from './selena-legacy-email'

beforeEach(() => {
  tenantDomainsRows = []
})

function tenant(overrides: Partial<{ id: string; name: string; domain: string | null; slug: string; phone: string | null }>) {
  return {
    id: TENANT_A,
    name: 'Test Tenant',
    email: null,
    phone: null,
    resend_api_key: null,
    email_from: null,
    domain: null,
    slug: 'test-tenant',
    ...overrides,
  }
}

describe('formatHtmlReply — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — links that host, not tenants.domain', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const html = await formatHtmlReply('hello', tenant({ domain: null }))
    expect(html).toContain('https://custom.example.com')
  })

  it('tenant_domains PRIMARY wins even when tenants.domain is also set (stale legacy value)', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'current.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const html = await formatHtmlReply('hello', tenant({ domain: 'stale-legacy.example.com' }))
    expect(html).toContain('https://current.example.com')
    expect(html).not.toContain('stale-legacy.example.com')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    const html = await formatHtmlReply('hello', tenant({ domain: 'legacy.example.com' }))
    expect(html).toContain('https://legacy.example.com')
  })

  it('falls back to the platform slug subdomain when neither tenant_domains nor tenants.domain resolve', async () => {
    const html = await formatHtmlReply('hello', tenant({ domain: null, slug: 'no-domain-tenant' }))
    expect(html).toContain('https://no-domain-tenant.homeservicesbusinesscrm.com')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's reply footer", async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: TENANT_B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const htmlA = await formatHtmlReply('hello', tenant({ id: TENANT_A, domain: null }))
    expect(htmlA).toContain('https://a-real.example.com')
    expect(htmlA).not.toContain('b-real.example.com')

    const htmlB = await formatHtmlReply('hello', tenant({ id: TENANT_B, domain: null }))
    expect(htmlB).toContain('https://b-real.example.com')
    expect(htmlB).not.toContain('a-real.example.com')
  })
})
