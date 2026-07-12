import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/admin/analytics/live-feed (converted to tenantDb).
 *
 * GET-only reader over the tenant-scoped `lead_clicks` table. The conversion
 * swaps `supabaseAdmin.from('lead_clicks').eq('tenant_id', …)` for tenantDb's
 * injected filter (the explicit `.eq('action','visit')` filter is preserved).
 * No by-id caller input (no IDOR surface). Probe proves a foreign tenant's
 * visit events never appear in the live feed.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    lead_clicks: [
      { id: 'lc-a1', tenant_id: A, action: 'visit', domain: 'a.example', page: '/', created_at: '2026-07-03T00:00:00Z', user_agent: 'Mozilla/5.0' },
      { id: 'lc-b1', tenant_id: B, action: 'visit', domain: 'b.example', page: '/', created_at: '2026-07-04T00:00:00Z', user_agent: 'Mozilla/5.0' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/analytics/live-feed — tenant isolation', () => {
  it("GET excludes a foreign tenant's visit events", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const domains = (body.visits as Array<{ domain: string }>).map((v) => v.domain)
    expect(domains).toEqual(['a.example'])
    expect(domains).not.toContain('b.example')
    expect(body.count).toBe(1)
  })
})
