/**
 * GET /api/cron/tenant-health — for a tenant with NO `tenants.domain` (Source 1)
 * and MULTIPLE active `tenant_domains` rows (Source 2, e.g. a multi-neighborhood
 * tenant), the loop building `byTenant` was supposed to prefer the `is_primary`
 * row over a non-primary one (`r.is_primary && !cur.primary`). It never could:
 * the guard `if (byTenant.has(r.tenant_id)) continue` fired on the tenant's
 * SECOND+ `tenant_domains` row too (not just when `tenants.domain` already won),
 * because the tenant's FIRST `tenant_domains` row already populated `byTenant`.
 * So `cur` was always `undefined` by the time the primary-preference check ran,
 * making it dead code — whichever row Postgres happened to return first (no
 * `.order()` on the query, so unspecified order) silently won, primary or not.
 * Health checks (and the `tenant_health` row read by the dashboard) could
 * therefore point at a secondary/neighborhood domain while the tenant's real
 * primary/customer-facing domain went unchecked.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'
import type { TenantHealth } from '@/lib/tenant-health'

const h = vi.hoisted(() => ({
  fake: null as FakeSupabase | null,
  alertOwner: vi.fn().mockResolvedValue({ ok: true }),
  checkedDomains: [] as string[],
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/telegram', () => ({
  alertOwner: (...args: unknown[]) => h.alertOwner(...args),
}))

vi.mock('@/lib/tenant-health', () => ({
  checkTenant: vi.fn(async (slug: string, domain: string): Promise<TenantHealth> => {
    h.checkedDomains.push(domain)
    return {
      slug,
      domain,
      status: 'pass',
      matchedPath: '/',
      checks: { reachable: true, routing: true, noLoop: true, formWired: true },
      detail: 'ok',
    }
  }),
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/tenant-health', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.alertOwner.mockClear()
  h.checkedDomains = []
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('multi-domain tenant with no tenants.domain', () => {
  it('checks the is_primary tenant_domains row, not whichever row sorts first', async () => {
    h.fake = createFakeSupabase({
      // No `domain` on the tenants row -- forces Source 2 (tenant_domains) to
      // be the only source, same as a tenant onboarded domain-first via
      // tenant_domains with tenants.domain never backfilled.
      tenants: [{ id: 't1', slug: 'acme', domain: null, status: 'active' }],
      // Non-primary row inserted (and thus returned) FIRST -- exactly the
      // ordering that exposed the dead-code primary-preference check.
      tenant_domains: [
        { tenant_id: 't1', domain: 'neighborhood.example.com', is_primary: false, active: true },
        { tenant_id: 't1', domain: 'primary.example.com', is_primary: true, active: true },
      ],
      tenant_health: [],
      tenant_health_alerts: [],
    })

    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    expect(h.checkedDomains).toEqual(['primary.example.com'])

    const healthRows = h.fake._all('tenant_health')
    expect(healthRows).toHaveLength(1)
    expect(healthRows[0].domain).toBe('primary.example.com')
  })
})
