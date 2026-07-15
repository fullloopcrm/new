import { describe, it, expect, vi } from 'vitest'

/**
 * GET/POST /api/dashboard/messages had zero permission check AND hardcoded
 * sender/sender_role:'owner' on every POST insert regardless of the actual
 * caller's role — any authenticated tenant member (staff/manager/admin)
 * could read the owner<->platform-admin thread and post replies that show
 * up in the thread impersonating the owner's identity. Level 1 platform
 * messaging is documented as the tenant OWNER's channel to Full Loop admin
 * (see file header comment), so the fix gates both handlers directly on
 * role === 'owner' (no RBAC permission covers this narrow a surface, same
 * pattern used by admin/users' owner-grant check).
 */

let mockRole = 'staff'

const fromMock = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
  update: () => ({
    eq: () => ({
      eq: () => ({
        is: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
  insert: () => ({
    select: () => ({
      single: () => Promise.resolve({ data: { id: 'msg-1' }, error: null }),
    }),
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: fromMock },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenant: { id: 'tenant-1', name: 'Acme Cleaning' },
    role: mockRole,
  })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

describe('GET/POST /api/dashboard/messages — owner-only gate', () => {
  it('GET rejects a non-owner role (staff) with 403', async () => {
    mockRole = 'staff'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('POST rejects a non-owner role (admin) with 403 and does not insert', async () => {
    mockRole = 'admin'
    vi.resetModules()
    fromMock.mockClear()
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/dashboard/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'impersonation attempt' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(403)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('GET/POST succeed for role === owner', async () => {
    mockRole = 'owner'
    vi.resetModules()
    const { GET, POST } = await import('./route')
    const getRes = await GET()
    expect(getRes.status).toBe(200)

    const req = new Request('http://localhost/api/dashboard/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'hello from owner' }),
    })
    const postRes = await POST(req as never)
    expect(postRes.status).toBe(200)
  })
})
