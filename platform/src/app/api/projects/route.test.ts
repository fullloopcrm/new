import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/projects — permission gate (regression, 2026-08-01).
 *
 * Same gap class as crm-04/bookings.ts/jobs.ts this session: GET had no
 * requirePermission call, only getTenantForRequest() -- a tenant using the
 * real per-role permission-override feature to revoke bookings.view would
 * have that silently ignored. Fixed to gate GET on bookings.view, matching
 * POST's pre-existing bookings.create gate.
 */

const h = vi.hoisted(() => ({
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [{ id: 'proj-1', title: 'Deck build' }], error: null }),
        }),
      }),
    }),
  },
}))
vi.mock('@/lib/tenant-supabase', () => ({ tenantClient: vi.fn() }))

import { GET } from './route'

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({
    tenant: { tenantId: 'tenant-A' },
    error: null,
  })
})

describe('GET /api/projects — permission gate', () => {
  it('calls requirePermission with bookings.view, not some other permission', async () => {
    await GET()

    expect(h.requirePermission).toHaveBeenCalledWith('bookings.view')
  })

  it('returns projects when the caller has bookings.view', async () => {
    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toHaveLength(1)
  })

  it('denies the request with the requirePermission error when the caller lacks bookings.view', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }),
    })

    const res = await GET()

    expect(res.status).toBe(403)
  })
})
