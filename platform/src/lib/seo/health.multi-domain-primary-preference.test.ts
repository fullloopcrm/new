/**
 * checkFleetHealth() — for a tenant with NO `tenants.domain` (Source 1) and
 * MULTIPLE active `tenant_domains` rows (Source 2, e.g. a multi-neighborhood
 * tenant), the loop building `byTenant` never had an `is_primary` preference
 * at all — unlike tenant-health/route.ts's Fortress cron (fixed 2026-07-18),
 * which at least attempted one (dead code, since `byTenant.has(tenantId)`
 * fired on the tenant's own 2nd+ row too). This file's `.eq('active', true)`
 * query has no `.order()`, so whichever row Postgres happens to return first
 * silently wins as "the" domain to HTTP-check — primary or not — and any
 * `site_down` seo_issue opened from a failure is filed against that domain,
 * not necessarily the tenant's real customer-facing one.
 */
import { describe, it, expect, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as FakeSupabase | null,
  fetchedUrls: [] as string[],
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/ssrf', () => ({
  safeFetch: vi.fn(async (url: string) => {
    h.fetchedUrls.push(url)
    return new Response(null, { status: 200 })
  }),
}))

import { checkFleetHealth } from './health'

describe('multi-domain tenant with no tenants.domain', () => {
  it('checks the is_primary tenant_domains row, not whichever row sorts first', async () => {
    h.fetchedUrls = []
    h.fake = createFakeSupabase({
      // No `domain` on the tenants row -- forces Source 2 (tenant_domains) to
      // be the only source.
      tenants: [{ id: 't1', domain: null, status: 'active' }],
      // Non-primary row inserted (and thus returned) FIRST -- exactly the
      // ordering that exposes the missing primary-preference.
      tenant_domains: [
        { tenant_id: 't1', domain: 'neighborhood.example.com', is_primary: false, active: true },
        { tenant_id: 't1', domain: 'primary.example.com', is_primary: true, active: true },
      ],
    })

    const results = await checkFleetHealth()

    expect(results).toHaveLength(1)
    expect(results[0].domain).toBe('primary.example.com')
    expect(h.fetchedUrls).toEqual(['https://primary.example.com/'])
  })
})
