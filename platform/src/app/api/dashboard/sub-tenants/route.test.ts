/**
 * POST/GET /api/dashboard/sub-tenants — the route-level piece that isn't
 * covered by createSubTenant's or getTenantForRequest's own tests: the
 * owner-only gate. createSubTenant itself is mocked out; this file tests
 * ONLY the route's auth/role handling and response shaping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getTenantForRequest = vi.fn()
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: () => getTenantForRequest(),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

const createSubTenant = vi.fn()
vi.mock('@/lib/create-sub-tenant', () => ({
  createSubTenant: (input: unknown) => createSubTenant(input),
}))

const supabaseSelect = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => supabaseSelect(),
        }),
      }),
    }),
  },
}))

import { GET, POST } from './route'

beforeEach(() => {
  getTenantForRequest.mockReset()
  createSubTenant.mockReset()
  supabaseSelect.mockReset().mockResolvedValue({ data: [], error: null })
})

function postReq(body: unknown) {
  return new NextRequest('https://x/api/dashboard/sub-tenants', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/dashboard/sub-tenants', () => {
  it('rejects a non-owner team member with 403 — never reaches createSubTenant', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'manager' })

    const res = await POST(postReq({ name: 'New Location' }))
    expect(res.status).toBe(403)
    expect(createSubTenant).not.toHaveBeenCalled()
  })

  it('lets the owner create a sub-tenant, scoped to their own tenantId as parent', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'owner' })
    createSubTenant.mockResolvedValue({ ok: true, tenant: { id: 'new-1', slug: 'x', name: 'New Location' } })

    const res = await POST(postReq({ name: 'New Location' }))
    expect(res.status).toBe(200)
    expect(createSubTenant).toHaveBeenCalledWith(expect.objectContaining({ parentTenantId: 'head-1', name: 'New Location' }))
  })

  it('rejects a missing name before ever calling createSubTenant', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'owner' })

    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
    expect(createSubTenant).not.toHaveBeenCalled()
  })
})

describe('GET /api/dashboard/sub-tenants', () => {
  it('is available to any authenticated team member, not owner-gated', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'manager' })
    supabaseSelect.mockResolvedValue({ data: [{ id: 'loc-1', name: 'Brooklyn' }], error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.subTenants).toHaveLength(1)
  })
})
