import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/audit (converted to tenantDb).
 *
 * GET-only audit-log reader over the tenant-scoped `audit_logs` table. The
 * conversion drops the explicit `.eq('tenant_id')` in favor of tenantDb's
 * injected filter. Probe proves a foreign tenant's log never appears and that
 * the `{ count: 'exact' }` total reflects only the acting tenant's rows. The
 * optional `entity_type` filter is a within-tenant refinement, not an
 * isolation boundary.
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
import { NextRequest } from 'next/server'

function seed() {
  return {
    audit_logs: [
      { id: 'log-a1', tenant_id: A, entity_type: 'booking', created_at: '2026-07-01T00:00:00Z' },
      { id: 'log-a2', tenant_id: A, entity_type: 'client', created_at: '2026-07-02T00:00:00Z' },
      { id: 'log-b1', tenant_id: B, entity_type: 'booking', created_at: '2026-07-03T00:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('audit — tenant isolation', () => {
  it("GET excludes a foreign tenant's logs and counts only the acting tenant", async () => {
    const res = await GET(new NextRequest('http://t/api/audit'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.logs as Array<{ id: string }>).map((l) => l.id)
    expect(ids.sort()).toEqual(['log-a1', 'log-a2'])
    expect(ids).not.toContain('log-b1')
    expect(body.total).toBe(2)
  })

  it('entity_type filter still excludes foreign tenant rows', async () => {
    const res = await GET(new NextRequest('http://t/api/audit?entity_type=booking'))
    const body = await res.json()
    const ids = (body.logs as Array<{ id: string }>).map((l) => l.id)
    expect(ids).toEqual(['log-a1'])
    expect(ids).not.toContain('log-b1') // foreign 'booking' log stays out
  })
})
