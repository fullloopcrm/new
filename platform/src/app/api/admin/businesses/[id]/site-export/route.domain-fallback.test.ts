import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/admin/businesses/[id]/site-export — domain-resolution fallback probe.
 *
 * BUG (fixed here): this route queried ONLY tenant_domains for the tenant's
 * live public domain, with no fallback to tenants.domain. The resolver used
 * at actual request time (getTenantByDomain in tenant.ts / tenant-lookup.ts)
 * checks tenant_domains FIRST and falls back to tenants.domain only when no
 * active tenant_domains row exists — this route skipped that fallback
 * entirely. A tenant live only via the legacy tenants.domain column (not yet
 * migrated to tenant_domains) always 400'd "No active domain found" here,
 * even though their site is reachable and the ownership-export promise
 * applies to them too. Same coverage-gap class already fixed this session in
 * seomgr's ingest.ts/onboarding.ts, backlinks.ts, and health.ts.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const exportSiteToZip = vi.hoisted(() => vi.fn())
vi.mock('@/lib/site-export', () => ({ exportSiteToZip }))

import { GET } from './route'

function seed() {
  return {
    tenant_domains: [] as Record<string, unknown>[],
    tenants: [
      { id: TENANT_A, domain: null as string | null },
      { id: TENANT_B, domain: null as string | null },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  exportSiteToZip.mockReset()
  exportSiteToZip.mockResolvedValue({ zip: Buffer.from('fake'), pages: 1, assets: 0, capped: false })
})

function get(id: string) {
  return GET(new Request('http://t/api/admin/businesses/' + id + '/site-export'), {
    params: Promise.resolve({ id }),
  })
}

describe('GET /api/admin/businesses/[id]/site-export — domain fallback probe', () => {
  it('uses the tenant_domains primary row when one exists', async () => {
    h.seed.tenant_domains.push({ tenant_id: TENANT_A, domain: 'acme.com', is_primary: true, active: true })
    const res = await get(TENANT_A)
    expect(res.status).toBe(200)
    expect(exportSiteToZip).toHaveBeenCalledWith('https://acme.com')
  })

  it('FALLBACK PROBE: no tenant_domains row, tenants.domain set — falls back instead of 400ing', async () => {
    ;(h.seed.tenants as Record<string, unknown>[]).find((t) => t.id === TENANT_A)!.domain = 'legacy-acme.com'
    const res = await get(TENANT_A)
    expect(res.status).toBe(200)
    expect(exportSiteToZip).toHaveBeenCalledWith('https://legacy-acme.com')
  })

  it('WRONG-TENANT PROBE: another tenant has a tenant_domains row, this tenant only has tenants.domain — falls back to its OWN domain, not tenant B\'s', async () => {
    h.seed.tenant_domains.push({ tenant_id: TENANT_B, domain: 'other-tenant.com', is_primary: true, active: true })
    ;(h.seed.tenants as Record<string, unknown>[]).find((t) => t.id === TENANT_A)!.domain = 'legacy-acme.com'
    const res = await get(TENANT_A)
    expect(res.status).toBe(200)
    expect(exportSiteToZip).toHaveBeenCalledWith('https://legacy-acme.com')
  })

  it('400s when neither tenant_domains nor tenants.domain has anything', async () => {
    const res = await get(TENANT_A)
    expect(res.status).toBe(400)
    expect(exportSiteToZip).not.toHaveBeenCalled()
  })

  it('MULTI-PRIMARY DETERMINISM PROBE: with 2 is_primary rows (seeded pre-sorted oldest-first, matching getPrimaryTenantDomain\'s own created_at-ascending ORDER BY), resolves via the OLDER row — this route previously hand-rolled an unordered `.find(d => d.is_primary)` that reintroduced the exact non-determinism getPrimaryTenantDomain (domains.ts) was hardened against', async () => {
    h.seed.tenant_domains.push(
      { tenant_id: TENANT_A, domain: 'older-primary.com', is_primary: true, active: true, created_at: '2026-01-01T00:00:00Z' },
      { tenant_id: TENANT_A, domain: 'newer-primary.com', is_primary: true, active: true, created_at: '2026-06-01T00:00:00Z' },
    )
    const res = await get(TENANT_A)
    expect(res.status).toBe(200)
    expect(exportSiteToZip).toHaveBeenCalledWith('https://older-primary.com')
  })
})
