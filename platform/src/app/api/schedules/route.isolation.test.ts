import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/schedules (converted to tenantDb).
 *
 * recurring_schedules is tenant-scoped; the list must exclude another tenant's
 * schedules. Wrong-tenant probe: tenant B's schedule is seeded but must not leak.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { GET } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-a', tenant_id: CTX_TENANT, status: 'active', clients: { name: 'Mine' }, team_members: null },
      { id: 'sch-b', tenant_id: OTHER_TENANT, status: 'active', clients: { name: 'Theirs' }, team_members: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('schedules GET — tenant isolation', () => {
  it('wrong-tenant probe: only the caller tenant\'s schedules are returned', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.schedules.map((s: { id: string }) => s.id)
    expect(ids).toContain('sch-a')
    expect(ids).not.toContain('sch-b')
  })
})
