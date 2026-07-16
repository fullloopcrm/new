import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/google/generate-reply — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * drives a billed Anthropic call (tenant's own key or the platform key) to
 * draft a reply meant to be posted to a live Google Business review via the
 * sibling /api/admin/google/reply (which requires reviews.request). Gating
 * the draft step at reviews.view would be a no-op — every default role
 * (including staff) already has reviews.view — so it's gated at
 * reviews.request instead, matching the actual mutate-workflow permission
 * this is a pre-step of (same reasoning as the campaigns/preview →
 * campaigns.create fix). Per default rbac.ts only staff lacks
 * reviews.request; owner/admin/manager all have it.
 *
 * FIX: requirePermission('reviews.request') on POST.
 */

const A = 'tid-a'

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a', name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: 'stored-key' } as Record<string, unknown>,
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

const createMock = vi.fn()
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({ messages: { create: createMock } }),
}))

import { POST } from './route'

beforeEach(() => {
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A, name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: 'stored-key' }
  createMock.mockReset()
  createMock.mockResolvedValue({ content: [{ type: 'text', text: 'Thanks so much for the kind words!' }] })
})

function req(body: Record<string, unknown> = { reviewerName: 'Jane', rating: 5, comment: 'Great job!' }) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/admin/google/generate-reply — permission probe', () => {
  it('owner (has reviews.request) can generate a draft reply', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it('admin (has reviews.request) can generate a draft reply', async () => {
    tenantHolder.role = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it('manager (has reviews.request) can generate a draft reply', async () => {
    tenantHolder.role = 'manager'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (has reviews.view but NOT reviews.request per default rbac.ts) is forbidden from generating a draft reply", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'reviews.request' from manager via a role_permissions override blocks POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      name: 'Acme Cleaning',
      industry: 'cleaning',
      anthropic_api_key: 'stored-key',
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
      industry: 'cleaning',
      anthropic_api_key: 'stored-key',
      selena_config: { role_permissions: { staff: { 'reviews.request': true } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(200)
  })
})
