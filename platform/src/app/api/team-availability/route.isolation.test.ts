import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Auth-boundary regression — /api/team-availability.
 *
 * This route used to authenticate with getCurrentTenant(), which resolves
 * the tenant purely from the signed x-tenant-id header middleware injects on
 * EVERY request to a tenant's own subdomain/custom domain — it performs no
 * session/admin_token check. middleware.ts's Clerk/PIN auth gate only runs
 * for isMainHost(); a request to <tenant>.fullloopcrm.com/api/team-availability
 * bypasses it entirely, so any unauthenticated site visitor could pull the
 * full team roster (names, skills, workload) plus a named client's preferred
 * team member and requirements. Fixed by switching to getTenantForRequest(),
 * which requires a verified admin_token or Clerk session in addition to the
 * tenant header (same fix shape as client-analytics/route.ts).
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/availability', () => ({
  checkTeamAvailability: vi.fn(async () => [{ id: 'mem-a1', name: 'Alex', available: true }]),
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
    getTenantForRequest: vi.fn(),
  }
})

import { GET } from './route'
import { getTenantForRequest } from '@/lib/tenant-query'

function seed() {
  return {
    clients: [
      { id: 'client-a1', tenant_id: A, preferred_team_member_id: 'mem-a1', requirements: ['spanish'] },
    ],
    bookings: [],
    team_members: [
      { id: 'mem-a1', tenant_id: A, status: 'active', skills: ['spanish'] },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  vi.mocked(getTenantForRequest).mockReset()
})

function req(qs: string) {
  return new NextRequest(`http://t/api/team-availability?${qs}`)
}

describe('team-availability — auth boundary', () => {
  it('unauthenticated request (no admin_token/session) is rejected — the header alone is not enough', async () => {
    const { AuthError } = await import('@/lib/tenant-query')
    vi.mocked(getTenantForRequest).mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await GET(req('date=2026-03-15'))
    expect(res.status).toBe(401)
    // Never reached the roster/client lookup on the failure path.
    expect(h.capture.inserts.length).toBe(0)
  })

  it("authenticated caller only sees their own tenant's client preferences", async () => {
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    } as never)

    const res = await GET(req('date=2026-03-15&client_id=client-a1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferred_member_id).toBe('mem-a1')
    expect(body.client_requirements).toEqual(['spanish'])
  })
})
