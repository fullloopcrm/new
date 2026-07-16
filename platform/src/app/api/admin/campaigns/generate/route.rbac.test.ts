import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/campaigns/generate — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * drives an AI (Anthropic) call billed to the tenant's own key — the same
 * campaign-authoring workflow every other write path in this family
 * (campaigns/route.ts POST, campaigns/[id]/route.ts PUT/DELETE,
 * campaigns/send/route.ts POST/PUT) gates behind campaigns.create. By
 * default rbac.ts grants 'manager' campaigns.view but NOT campaigns.create,
 * and 'staff' gets no campaigns.* at all, so any staff-tier (or manager-tier)
 * member could already trigger AI generation with zero role check. No live
 * frontend caller exists yet, but (unlike routes that always 401) this one
 * fully executes for any authenticated tenant member.
 *
 * FIX: requirePermission('campaigns.create') on POST, matching the rest of
 * the campaigns family's create-workflow gate.
 */

const A = 'tid-a'

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a', name: 'Acme Cleaning', anthropic_api_key: 'stored-key' } as Record<string, unknown>,
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
  tenantHolder.tenant = { id: A, name: 'Acme Cleaning', anthropic_api_key: 'stored-key' }
  createMock.mockReset()
  createMock.mockResolvedValue({
    content: [{ type: 'text', text: '{"name":"Spring Promo","subject":"Hi","email_body":"","sms_body":""}' }],
  })
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'spring cleaning promo', channel: 'email' }),
  })
}

describe('POST /api/admin/campaigns/generate — permission probe', () => {
  it('owner (has campaigns.create) can generate campaign copy', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it('admin (has campaigns.create) can generate campaign copy', async () => {
    tenantHolder.role = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has campaigns.view but NOT campaigns.create per default rbac.ts) is forbidden from generating campaign copy", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'staff' (no campaigns.* per default rbac.ts) is forbidden from generating campaign copy", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'campaigns.create' from admin via a role_permissions override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      name: 'Acme Cleaning',
      anthropic_api_key: 'stored-key',
      selena_config: { role_permissions: { admin: { 'campaigns.create': false } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that grants 'campaigns.create' to manager via a role_permissions override allows POST for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      name: 'Acme Cleaning',
      anthropic_api_key: 'stored-key',
      selena_config: { role_permissions: { manager: { 'campaigns.create': true } } },
    }
    const res = await POST(req())
    expect(res.status).toBe(200)
  })
})
