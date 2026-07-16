import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/google/reply — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * PUTs a live, publicly-visible reply to the tenant's Google Business review
 * via the Google My Business API and writes it into google_reviews — the
 * exact same mutate action admin/reviews/route.ts (approve/reject/feature/
 * delete on-site reviews) already gates behind reviews.request. By default
 * rbac.ts grants reviews.request to owner/admin/manager but NOT staff, so
 * any staff-tier member could already post arbitrary public-facing content
 * as the business's official review reply with zero role check.
 *
 * FIX: requirePermission('reviews.request') on POST.
 */

const A = 'tid-a'

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a', name: 'Acme Cleaning' } as Record<string, unknown>,
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

vi.mock('@/lib/google', () => ({
  getValidAccessToken: vi.fn(async () => 'access-token-xyz'),
  getGoogleBusiness: vi.fn(async () => ({ location_name: 'accounts/1/locations/2' })),
}))

const { fromMock } = vi.hoisted(() => {
  const eqMock = vi.fn(() => ({ eq: eqMock }))
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  return { fromMock }
})
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: fromMock },
}))

const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '' }))
vi.stubGlobal('fetch', fetchMock)

import { POST } from './route'

beforeEach(() => {
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A, name: 'Acme Cleaning' }
  fetchMock.mockClear()
  fetchMock.mockResolvedValue({ ok: true, text: async () => '' })
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ reviewId: 'rev-1', reply: 'Thanks for the feedback!' }),
  })
}

describe('POST /api/admin/google/reply — permission probe', () => {
  it('owner (has reviews.request) can post a reply', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('admin (has reviews.request) can post a reply', async () => {
    tenantHolder.role = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it('manager (has reviews.request) can post a reply', async () => {
    tenantHolder.role = 'manager'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (has reviews.view but NOT reviews.request per default rbac.ts) is forbidden from posting a reply", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: a tenant that revokes 'reviews.request' from manager via a role_permissions override blocks POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      name: 'Acme Cleaning',
      selena_config: { role_permissions: { manager: { 'reviews.request': false } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that grants 'reviews.request' to staff via a role_permissions override allows POST for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      name: 'Acme Cleaning',
      selena_config: { role_permissions: { staff: { 'reviews.request': true } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(200)
  })
})
