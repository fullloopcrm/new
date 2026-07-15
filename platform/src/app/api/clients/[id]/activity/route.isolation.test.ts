import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Auth-boundary regression — /api/clients/[id]/activity.
 *
 * This route used to authenticate with getCurrentTenant(), which resolves
 * the tenant purely from the signed x-tenant-id header middleware injects on
 * EVERY request to a tenant's own subdomain/custom domain — it performs no
 * session/admin_token check. middleware.ts's Clerk/PIN auth gate only runs
 * for isMainHost(); a request to <tenant>.fullloopcrm.com/api/clients/<id>/activity
 * bypasses it entirely, so any unauthenticated site visitor who knew (or
 * enumerated) a client id could pull that client's full booking timeline —
 * payment amounts and GPS check-in/out locations included. Fixed by
 * switching to getTenantForRequest(), which requires a verified admin_token
 * or Clerk session in addition to the tenant header (matches sibling
 * clients/[id]/route.ts).
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
    getTenantForRequest: vi.fn(),
  }
})

import { GET } from './route'
import { getTenantForRequest } from '@/lib/tenant-query'

function seed() {
  return {
    clients: [
      { id: 'client-a1', tenant_id: A, name: 'Tenant A Client', created_at: '2026-01-01T00:00:00Z' },
      { id: 'client-b1', tenant_id: B, name: 'Tenant B Client', created_at: '2026-01-01T00:00:00Z' },
    ],
    bookings: [
      {
        id: 'bk-a1', tenant_id: A, client_id: 'client-a1',
        start_time: '2026-02-01T10:00:00Z', payment_status: 'paid', price: 15000,
        check_in_time: '2026-02-01T10:05:00Z', check_in_location: { lat: 40.7, lng: -74.0 },
      },
    ],
    notifications: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  vi.mocked(getTenantForRequest).mockReset()
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('clients/[id]/activity — auth boundary', () => {
  it('unauthenticated request (no admin_token/session) is rejected — the tenant header alone is not enough', async () => {
    const { AuthError } = await import('@/lib/tenant-query')
    vi.mocked(getTenantForRequest).mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await GET(new Request('http://t/api/clients/client-a1/activity'), params('client-a1'))
    expect(res.status).toBe(401)
  })

  it("wrong-tenant probe: authenticated tenant A cannot read tenant B's client activity", async () => {
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    } as never)

    const res = await GET(new Request('http://t/api/clients/client-b1/activity'), params('client-b1'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it("authenticated tenant A sees their own client's booking + payment activity", async () => {
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: 'owner',
    } as never)

    const res = await GET(new Request('http://t/api/clients/client-a1/activity'), params('client-a1'))
    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ type: string }>
    expect(body.some((a) => a.type === 'payment_received')).toBe(true)
    expect(body.some((a) => a.type === 'check_in')).toBe(true)
  })
})
