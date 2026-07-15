import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/team — missing-authz + credential-leak (P1/W1 broad-hunt).
 * Was `getTenantForRequest()` only (any authenticated role, no permission
 * check at all — a per-tenant `role_permissions` override revoking
 * team.view was silently ignored, same asymmetric-gating class this session
 * has repeatedly fixed elsewhere). Fixed to require team.view.
 *
 * Separately: the list `.select('*')` returned `pin` — the 4-digit
 * team-portal login credential (see POST /api/team) — to EVERY caller of
 * this endpoint, even though none of its 9 dashboard consumers (calendar
 * views, bookings admin, jobs, clients, map, schedules) read that field.
 * Any tenant member able to load one of those pages (including 'staff',
 * which has team.view by default) could harvest every teammate's plaintext
 * login PIN in one call and impersonate them via team-portal (job
 * claim/reassign, messages, pay-rate view) with zero brute-forcing needed.
 * Stripped `pin` from the list response only — the [id] detail endpoint
 * still returns it for its existing single-member admin card view.
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
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({ default_pay_rate: 0, default_working_days: [] })) }))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.role = 'owner'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, role: h.role, tenant: { id: h.tenantId } }))
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice', pin: '4821', role: 'owner' },
      { id: 'tm-A2', tenant_id: 'tenant-A', name: 'Bob', pin: '1193', role: 'staff' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Eve', pin: '5555', role: 'owner' },
    ],
  }
})

describe('GET /api/team — permission gate', () => {
  it('owner (has team.view) can list the roster', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    const ids = json.team.map((t: { id: string }) => t.id)
    expect(ids).toEqual(['tm-A1', 'tm-A2'])
  })

  it("PERMISSION PROBE: a tenant override revoking staff's team.view is honored (was previously ignored)", async () => {
    h.role = 'staff'
    h.getTenantForRequest.mockImplementation(async () => ({
      tenantId: h.tenantId,
      role: h.role,
      tenant: { id: h.tenantId, selena_config: { role_permissions: { staff: { 'team.view': false } } } },
    }))
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('GET /api/team — credential exposure', () => {
  it('never returns the pin field on the roster listing', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.team.length).toBeGreaterThan(0)
    for (const member of json.team) {
      expect(member).not.toHaveProperty('pin')
    }
  })

  it("only ever returns the caller tenant's own team members", async () => {
    const res = await GET()
    const json = await res.json()
    const ids = json.team.map((t: { id: string }) => t.id)
    expect(ids).not.toContain('tm-B1')
  })
})
