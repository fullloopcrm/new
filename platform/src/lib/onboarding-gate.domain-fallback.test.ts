import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * runOnboardingGate() (lib/onboarding-gate.ts) — resolver-precedence
 * bug-class probe.
 *
 * BUG (fixed here): the SITE stage's `host` (which also gates the LEAD
 * stage) was resolved from tenant.domain/domain_name directly, never
 * consulting tenant_domains. A tenant whose real custom domain lives only
 * in tenant_domains (the normal state — admin/websites writes
 * tenant_domains only, never tenants.domain) failed both stages here with a
 * live, correctly-registered custom domain — and runOnboardingGate's
 * `passed` flag (stages.every) gates this tenant's onboarding->active flip
 * via activate-tenant.ts. Fixed by resolving through getPrimaryTenantDomain()
 * first, tenants.domain/domain_name as fallback.
 */

const A = 'tid-gate-a'
const B = 'tid-gate-b'

let tenantsRows: Record<string, unknown>[] = []
let tenantDomainsRows: Record<string, unknown>[] = []
let teamMembersRows: Record<string, unknown>[] = []
let portalLeadsErrorsByTenant: Record<string, { message: string } | null> = {}

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      order: () => chain,
      single: async () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return { data: hit[0] || null, error: null }
      },
      then: (resolve: (v: { data: unknown; error: null; count: number }) => void) => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        resolve({ data: hit, error: null, count: hit.length })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return makeTable(() => tenantsRows)()
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      if (table === 'team_members') return makeTable(() => teamMembersRows)()
      if (table === 'portal_leads') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: any = {
          select: () => chain,
          eq: (col: string, val: unknown) => {
            if (col === 'tenant_id') chain._tenantId = val
            return chain
          },
          then: (resolve: (v: { data: unknown; error: unknown; count: number }) => void) => {
            resolve({ data: [], error: portalLeadsErrorsByTenant[chain._tenantId] || null, count: 0 })
          },
        }
        return chain
      }
      return makeTable(() => [])()
    },
  },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    service_types: [{ active: true }],
    default_duration_hours: 2,
    payment_methods: ['stripe'],
    google_review_link: 'https://g.page/review',
  })),
}))

vi.mock('@/lib/availability', () => ({
  checkAvailability: vi.fn(async () => ({})),
}))

import { runOnboardingGate } from './onboarding-gate'

function stage(result: Awaited<ReturnType<typeof runOnboardingGate>>, key: string) {
  return result.stages.find((s) => s.stage === key)!
}

beforeEach(() => {
  tenantDomainsRows = []
  teamMembersRows = [{ id: 'tm-1', tenant_id: A, status: 'active' }]
  portalLeadsErrorsByTenant = {}
  tenantsRows = [
    { id: A, name: 'Tenant A', slug: A, domain: null, domain_name: null, website_url: null, google_place_id: 'place-a' },
  ]
})

describe('runOnboardingGate — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — SITE and LEAD stages pass', async () => {
    tenantDomainsRows = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const result = await runOnboardingGate(A)
    expect(stage(result, 'site').ok).toBe(true)
    expect(stage(result, 'site').detail).toContain('custom.example.com')
    expect(stage(result, 'lead').ok).toBe(true)
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    tenantsRows = [{ ...tenantsRows[0], domain: 'legacy.example.com' }]
    const result = await runOnboardingGate(A)
    expect(stage(result, 'site').ok).toBe(true)
    expect(stage(result, 'site').detail).toContain('legacy.example.com')
  })

  it('still falls back to the slug-based host when neither tenant_domains nor tenants.domain resolve', async () => {
    const result = await runOnboardingGate(A)
    expect(stage(result, 'site').ok).toBe(true)
    expect(stage(result, 'site').detail).toContain(`${A}.fullloopcrm.com`)
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's SITE stage", async () => {
    tenantDomainsRows = [
      { tenant_id: A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const resultA = await runOnboardingGate(A)
    expect(stage(resultA, 'site').detail).toContain('a-real.example.com')
    expect(stage(resultA, 'site').detail).not.toContain('b-real.example.com')

    tenantsRows = [...tenantsRows, { id: B, name: 'Tenant B', slug: B, domain: null, domain_name: null, website_url: null, google_place_id: 'place-b' }]
    teamMembersRows = [...teamMembersRows, { id: 'tm-2', tenant_id: B, status: 'active' }]
    const resultB = await runOnboardingGate(B)
    expect(stage(resultB, 'site').detail).toContain('b-real.example.com')
    expect(stage(resultB, 'site').detail).not.toContain('a-real.example.com')
  })
})
