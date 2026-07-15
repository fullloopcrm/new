import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/dashboard — bookings.view gate (broad-hunt: the operator dashboard
 * aggregator — today/week/month/year bookings, map data, financials, client
 * counts, team list — had zero permission check, only base tenant auth via
 * getTenantForRequest()). Any authenticated tenant member, including a role
 * with no permissions at all, could hit this directly and pull full revenue
 * and roster data. Gated on 'bookings.view', which every built-in role
 * (including 'staff') holds per rbac.ts, so no legitimate caller loses
 * access — this closes the "zero permission required" hole specifically.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  selenaConfig: null as Record<string, unknown> | null,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string; selenaConfig: Record<string, unknown> | null }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: h.selenaConfig },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.selenaConfig = null
  h.store = {
    bookings: [],
    clients: [],
    team_members: [],
  }
})

describe('GET /api/dashboard — bookings.view permission', () => {
  it('allows a staff member (has bookings.view by default) to load the dashboard', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('allows an owner to load the dashboard', async () => {
    h.role = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('rejects a role with bookings.view revoked via tenant override, proving the gate is live', async () => {
    h.selenaConfig = { role_permissions: { staff: { 'bookings.view': false } } }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
