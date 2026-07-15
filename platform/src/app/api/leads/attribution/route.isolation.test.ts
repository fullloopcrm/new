import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/leads/attribution (converted to tenantDb).
 *
 * GET-only reader over the tenant-scoped `website_visits` table. The conversion
 * swaps `supabaseAdmin.from('website_visits').eq('tenant_id', …)` for tenantDb's
 * injected filter (the `.gte('created_at', …)` window filter is preserved; the
 * `.not('referrer','is',null)` filter is a no-op in the harness so seeds use
 * non-null referrers). No by-id caller input (no IDOR surface). Probe proves a
 * foreign tenant's visits never contribute to the source-attribution breakdown.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Huge window so `since` sits far in the past and every seeded visit passes the
// `.gte('created_at', …)` filter regardless of wall-clock time at run.
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ attribution_window_hours: 8_760_000 })),
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { GET } from './route'

function seed() {
  return {
    website_visits: [
      { id: 'wv-a1', tenant_id: A, referrer: 'https://google.com/search', created_at: '2026-07-10T00:00:00Z' },
      { id: 'wv-a2', tenant_id: A, referrer: 'https://yelp.com/biz', created_at: '2026-07-10T01:00:00Z' },
      { id: 'wv-b1', tenant_id: B, referrer: 'https://google.com/search', created_at: '2026-07-10T02:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('leads/attribution — tenant isolation', () => {
  it("GET excludes a foreign tenant's visits from the attribution breakdown", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    // Only tenant A's two visits count — B's Google visit must not inflate totals.
    expect(body.total).toBe(2)
    const bySource = Object.fromEntries(
      (body.attribution as Array<{ source: string; count: number }>).map((s) => [s.source, s.count]),
    )
    expect(bySource.Google).toBe(1)
    expect(bySource.Yelp).toBe(1)
  })
})
