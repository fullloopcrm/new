import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/clients/[id]/activity used to gate on getCurrentTenant(), which
 * resolves successfully for ANY visitor on a tenant's own domain via
 * middleware's signed x-tenant-id header -- that header is set for every
 * request to a tenant's site (marketing pages included), not just logged-in
 * dashboard sessions. An anonymous visitor who guessed/obtained a client UUID
 * could pull that client's full booking history, including check-in/out GPS
 * coordinates and payment amounts, with zero authentication.
 *
 * Fixed by switching to requirePermission('clients.view'), matching the
 * sibling clients/[id]/transcript route's existing pattern. Ported from
 * sibling-branch commit c251dcf3.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_ID = 'client-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: CLIENT_ID, tenant_id: TENANT_A, name: 'Jane Doe', created_at: '2026-01-01' }],
  bookings: [],
  notifications: [],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || []
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    single: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const { authState } = vi.hoisted(() => ({ authState: { authenticated: false } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (!authState.authenticated) throw new Error('no session')
    return { tenantId: TENANT_A, role: 'staff', tenant: {} }
  },
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

const params = Promise.resolve({ id: CLIENT_ID })
const req = new Request('http://x')

describe('/api/clients/[id]/activity — unauthenticated host-header bypass', () => {
  beforeEach(() => {
    authState.authenticated = false
  })

  it('rejects an anonymous visitor who only has a host-resolved tenant (no session)', async () => {
    const res = await GET(req, { params })
    expect(res.status).toBe(401)
  })

  it('allows a real authenticated session with clients.view', async () => {
    authState.authenticated = true
    const res = await GET(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
