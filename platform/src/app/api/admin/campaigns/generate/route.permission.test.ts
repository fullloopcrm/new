import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/campaigns/generate — campaigns.create gate (broad-hunt:
 * session-auth only, no requirePermission check, despite spending the
 * tenant's Anthropic key to draft campaign email/SMS copy on every call).
 * Per rbac.ts 'staff'/'manager' lack campaigns.create (manager only has
 * campaigns.view); 'admin'/'owner' have it and must keep working.
 */

const h = vi.hoisted(() => ({
  role: 'staff' as string,
  create: vi.fn(),
})) as unknown as {
  role: string
  create: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 'tenant-A',
    tenant: { id: 'tenant-A', name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: 'plaintext-key' },
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
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: { create: (...a: unknown[]) => h.create(...a) },
  }),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.role = 'staff'
  h.create.mockReset()
  h.create.mockResolvedValue({ content: [{ type: 'text', text: '{"name":"Spring Sale","subject":"Save now","email_body":"","sms_body":""}' }] })
})

describe('POST /api/admin/campaigns/generate — campaigns.create permission', () => {
  it('rejects a staff member (no campaigns.create) with 403 before calling the model', async () => {
    const res = await POST(postReq({ prompt: 'spring sale', channel: 'email' }))

    expect(res.status).toBe(403)
    expect(h.create).not.toHaveBeenCalled()
  })

  it('rejects a manager (campaigns.view only, no campaigns.create) with 403', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ prompt: 'spring sale', channel: 'email' }))

    expect(res.status).toBe(403)
    expect(h.create).not.toHaveBeenCalled()
  })

  it('allows an admin (has campaigns.create) through to generate copy', async () => {
    h.role = 'admin'
    const res = await POST(postReq({ prompt: 'spring sale', channel: 'email' }))

    expect(res.status).toBe(200)
    expect(h.create).toHaveBeenCalledTimes(1)
  })

  it('allows an owner through', async () => {
    h.role = 'owner'
    const res = await POST(postReq({ prompt: 'spring sale', channel: 'email' }))

    expect(res.status).toBe(200)
  })
})
