import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/google/generate-reply — reviews.request gate (broad-hunt:
 * this route only called getTenantForRequest() for base tenant auth, no
 * requirePermission check. It pairs with /api/admin/google/reply — a staff
 * member without reviews.request shouldn't be able to draft a public review
 * response either. Per rbac.ts 'staff' has reviews.view only, not
 * reviews.request; 'manager'/'admin'/'owner' all have it and must keep
 * working.
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
  h.create.mockResolvedValue({ content: [{ type: 'text', text: 'Thanks for the feedback!' }] })
})

describe('POST /api/admin/google/generate-reply — reviews.request permission', () => {
  it('rejects a staff member (no reviews.request) with 403 before calling the model', async () => {
    const res = await POST(postReq({ reviewerName: 'Alice', rating: 5, comment: 'Great job!' }))

    expect(res.status).toBe(403)
    expect(h.create).not.toHaveBeenCalled()
  })

  it('allows a manager (has reviews.request) through to generate a draft', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ reviewerName: 'Alice', rating: 5, comment: 'Great job!' }))

    expect(res.status).toBe(200)
    expect(h.create).toHaveBeenCalledTimes(1)
  })

  it('allows an admin through', async () => {
    h.role = 'admin'
    const res = await POST(postReq({ reviewerName: 'Alice', rating: 5, comment: 'Great job!' }))

    expect(res.status).toBe(200)
  })

  it('allows an owner through', async () => {
    h.role = 'owner'
    const res = await POST(postReq({ reviewerName: 'Alice', rating: 5, comment: 'Great job!' }))

    expect(res.status).toBe(200)
  })
})
