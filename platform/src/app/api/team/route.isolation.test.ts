import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/team (converted to tenantDb).
 *
 * GET lists `team_members` for the acting tenant only — a foreign tenant's
 * crew member must never appear. POST (permission-gated) inserts a member with
 * tenant_id stamped from context, so a forged body tenant_id cannot plant a row
 * in another tenant.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: roleHolder.role })),
  }
})

// GET and POST are both permission-gated; return tenant A under whatever
// role the test set, so both run under A's context with that role's
// permissions, including (or excluding) team.compensation.
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: A, tenant: { id: A }, role: roleHolder.role },
    error: null,
  })),
  overridesFor: vi.fn(() => null),
}))

// Settings only supplies numeric/array defaults; no DB access needed in-probe.
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ default_pay_rate: 0, default_working_days: [] })),
}))

import { GET, POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-a1', tenant_id: A, name: 'Ana', status: 'active', created_at: '2026-01-02', pay_rate: 22, hourly_rate: 30 },
      { id: 'tm-b1', tenant_id: B, name: 'Foreign Ben', status: 'active', created_at: '2026-01-01' },
    ],
    ratings: [
      { id: 'r1', tenant_id: A, team_member_id: 'tm-a1', cleaner_rating: 5, created_at: '2026-01-01' },
      { id: 'r2', tenant_id: A, team_member_id: 'tm-a1', cleaner_rating: 3, created_at: '2026-01-05' },
      // foreign tenant's rating on the SAME member id — must never bleed into A's trend
      { id: 'r3', tenant_id: B, team_member_id: 'tm-a1', cleaner_rating: 1, created_at: '2026-01-06' },
    ],
    audit_logs: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

describe('team — tenant isolation', () => {
  it("GET excludes a foreign tenant's team member", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.team as Array<{ id: string }>).map((m) => m.id)
    expect(ids).toEqual(['tm-a1'])
    expect(ids).not.toContain('tm-b1')
  })

  it('includes each card a rating trend, scoped to the acting tenant only', async () => {
    const res = await GET()
    const body = await res.json()
    const ana = (body.team as Array<{ id: string; trend_avg_rating: number | null; trend_rating_count: number }>)
      .find((m) => m.id === 'tm-a1')
    // (5 + 3) / 2 = 4, NOT including tenant B's 1-star row on the same member id
    expect(ana?.trend_avg_rating).toBe(4)
    expect(ana?.trend_rating_count).toBe(2)
  })

  it('POST stamps the acting tenant (ignores a forged body tenant_id)', async () => {
    const req = new Request('http://t/api/team', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Cleaner', tenant_id: B }), // forged foreign tenant
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const inserted = h.capture.inserts.find((i) => i.table === 'team_members')
    expect(inserted).toBeTruthy()
    expect(inserted!.rows[0].tenant_id).toBe(A) // stamp wins over forged B
    expect(inserted!.rows[0].name).toBe('New Cleaner')
  })

  it('owner (has team.compensation) sees pay_rate/hourly_rate in the roster', async () => {
    const res = await GET()
    const body = await res.json()
    const ana = (body.team as Array<{ id: string; pay_rate?: number; hourly_rate?: number }>).find((m) => m.id === 'tm-a1')
    expect(ana?.pay_rate).toBe(22)
    expect(ana?.hourly_rate).toBe(30)
  })

  it('staff (no team.compensation) never sees pay_rate/hourly_rate in the roster', async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    const body = await res.json()
    const ana = (body.team as Array<Record<string, unknown>>).find((m) => m.id === 'tm-a1')!
    expect(ana.pay_rate).toBeUndefined()
    expect(ana.hourly_rate).toBeUndefined()
    expect(ana.name).toBe('Ana') // non-compensation fields still visible
  })
})
