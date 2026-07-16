import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/cleaners — credential exposure (P1/W1 broad-hunt). Legacy
 * nycmaid-compat shim for team_members, still wired into dashboard/team,
 * BookingsAdmin, and jobs/crews. Unlike its modern sibling GET /api/team
 * (already fixed to strip `pin`, see route.test.ts there), this route's
 * select('*') returned the plaintext team-portal login PIN to every caller
 * with team.view — including 'staff', the lowest tier, which holds
 * team.view by default. None of this route's 3 consumers read `pin`.
 * Ported the same strip-pin fix.
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
vi.mock('@/lib/geo', () => ({ geocodeAddress: vi.fn(async () => null) }))

import { GET } from './route'

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

describe('GET /api/cleaners — permission gate', () => {
  it('owner (has team.view) can list the roster', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    const ids = json.map((t: { id: string }) => t.id)
    expect(ids).toEqual(['tm-A1'])
  })

  it("staff (has team.view by default) can also list the roster", async () => {
    h.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('GET /api/cleaners — credential exposure', () => {
  it('never returns the pin field, for any caller role', async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.length).toBeGreaterThan(0)
    for (const member of json) {
      expect(member).not.toHaveProperty('pin')
    }
  })

  it("PIN PROBE: staff cannot harvest a teammate's plaintext login pin via this legacy endpoint", async () => {
    h.role = 'staff'
    const res = await GET()
    const json = await res.json()
    for (const member of json) {
      expect(member).not.toHaveProperty('pin')
    }
  })

  it("only ever returns the caller tenant's own team members", async () => {
    const res = await GET()
    const json = await res.json()
    const ids = json.map((t: { id: string }) => t.id)
    expect(ids).not.toContain('tm-B1')
  })
})
