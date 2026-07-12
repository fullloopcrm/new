import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/crews (converted to tenantDb).
 *
 * A crew belonging to another tenant must never appear in the caller tenant's
 * list. (crew_members is an un-scoped join table by design — see the route's
 * own note — but the crew row itself is tenant-scoped through tenantDb.)
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
    crews: [
      { id: 'crew-a', tenant_id: CTX_TENANT, name: 'Alpha', color: null, active: true, crew_members: [] },
      { id: 'crew-b', tenant_id: OTHER_TENANT, name: 'Bravo', color: null, active: true, crew_members: [] },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('crews GET — tenant isolation', () => {
  it('wrong-tenant probe: only the caller tenant\'s crews are listed', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const names = body.crews.map((c: { name: string }) => c.name)
    expect(names).toContain('Alpha')
    expect(names).not.toContain('Bravo')
    const ids = body.crews.map((c: { id: string }) => c.id)
    expect(ids).not.toContain('crew-b')
  })
})
