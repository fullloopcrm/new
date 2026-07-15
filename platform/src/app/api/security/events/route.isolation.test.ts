import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/security/events (converted to tenantDb).
 *
 * GET-only reader over the tenant-scoped `security_events` table. The
 * conversion swaps `supabaseAdmin.from('security_events').eq('tenant_id', …)`
 * for tenantDb's injected filter. No by-id caller input (no IDOR surface).
 * Probe proves a foreign tenant's security event never appears in the feed.
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
    security_events: [
      { id: 'ev-a1', tenant_id: A, event_type: 'login', created_at: '2026-07-02T00:00:00Z' },
      { id: 'ev-b1', tenant_id: B, event_type: 'login_failed', created_at: '2026-07-03T00:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('security/events — tenant isolation', () => {
  it("GET excludes a foreign tenant's security events", async () => {
    const res = await GET(new Request('http://t/api/security/events'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.events as Array<{ id: string }>).map((e) => e.id)
    expect(ids).toEqual(['ev-a1'])
    expect(ids).not.toContain('ev-b1')
  })
})
