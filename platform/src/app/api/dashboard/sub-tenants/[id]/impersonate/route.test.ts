/**
 * POST/DELETE .../sub-tenants/[id]/impersonate — the route-level piece not
 * covered elsewhere: owner-only gate, descendant-only gate, and that the
 * signed cookie only gets set once BOTH pass. isDescendantOfTenant itself is
 * mocked out here (it has its own tests in tenant-hierarchy.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const isDescendantOfTenant = vi.fn()
vi.mock('@/lib/tenant-hierarchy', () => ({
  isDescendantOfTenant: (a: string, b: string) => isDescendantOfTenant(a, b),
}))

const cookieSet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
}))

vi.mock('@/lib/impersonation', () => ({
  IMPERSONATE_COOKIE: 'fl_impersonate',
  signImpersonation: (id: string) => `signed.${id}`,
}))

const tenantSelect = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => tenantSelect(),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  getTenantForRequest.mockReset()
  isDescendantOfTenant.mockReset()
  cookieSet.mockReset()
  tenantSelect.mockReset().mockResolvedValue({ data: { id: 'loc-1', name: 'Brooklyn' }, error: null })
})

describe('POST .../sub-tenants/[id]/impersonate', () => {
  it('rejects a non-owner with 403 — never checks descendant status or sets a cookie', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'manager' })

    const res = await POST(new Request('https://x'), params('loc-1'))
    expect(res.status).toBe(403)
    expect(isDescendantOfTenant).not.toHaveBeenCalled()
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('rejects an owner targeting a tenant that is NOT a descendant — no cookie set', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'owner' })
    isDescendantOfTenant.mockResolvedValue(false)

    const res = await POST(new Request('https://x'), params('unrelated-1'))
    expect(res.status).toBe(403)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('sets the signed impersonation cookie for an owner viewing a real descendant', async () => {
    getTenantForRequest.mockResolvedValue({ tenantId: 'head-1', role: 'owner' })
    isDescendantOfTenant.mockResolvedValue(true)

    const res = await POST(new Request('https://x'), params('loc-1'))
    expect(res.status).toBe(200)
    expect(cookieSet).toHaveBeenCalledWith('fl_impersonate', 'signed.loc-1', expect.objectContaining({ httpOnly: true }))
  })
})
