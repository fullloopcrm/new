import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/team/[id] — missing-authz (P1/W1 broad-hunt). Was
 * `getTenantForRequest()` only, unlike sibling PUT/DELETE (already gated on
 * team.edit/team.delete) — same asymmetric-gating class as GET /api/team.
 * Fixed to require team.view, matching the list endpoint's convention.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  role: 'owner' as string,
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => undefined) }))

import { GET } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.role = 'owner'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: h.role, tenant: { id: h.tenantId } }))
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice', pin: '4821' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Eve', pin: '5555' },
    ],
  }
})

describe('GET /api/team/[id] — permission gate', () => {
  it('owner (has team.view) can read a member', async () => {
    const res = await GET(new Request('http://x'), params('tm-A1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant override revoking staff's team.view is honored (was previously ignored)", async () => {
    h.role = 'staff'
    h.getTenantForRequest.mockImplementation(async () => ({
      tenantId: h.tenantId,
      role: h.role,
      tenant: { id: h.tenantId, selena_config: { role_permissions: { staff: { 'team.view': false } } } },
    }))
    const res = await GET(new Request('http://x'), params('tm-A1'))
    expect(res.status).toBe(403)
  })

  it("never resolves another tenant's member", async () => {
    const res = await GET(new Request('http://x'), params('tm-B1'))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/team/[id] — credential exposure', () => {
  it('owner still sees pin (intentional admin card view)', async () => {
    const res = await GET(new Request('http://x'), params('tm-A1'))
    const json = await res.json()
    expect(json.member.pin).toBe('4821')
  })

  it("PIN PROBE: staff (has team.view by default) cannot harvest a teammate's pin via this endpoint", async () => {
    h.role = 'staff'
    const res = await GET(new Request('http://x'), params('tm-A1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.member).not.toHaveProperty('pin')
  })
})
