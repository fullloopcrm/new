import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/auth/route.ts (docs/adr/0004).
 * PINs are short (often 4-digit) codes chosen per-tenant, so collisions across
 * tenants are realistic. The route resolves tenant first (by slug), then must
 * scope the PIN lookup to that tenant — otherwise a worker logging in with a
 * PIN that happens to match another tenant's worker could mint a token for
 * the wrong tenant/member. The LEAK CONTROL proves an unscoped PIN lookup
 * can't even disambiguate which member to log in as.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_PIN = '1234'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: A_ID, name: 'A Co', slug: 'biz-a', status: 'active', phone: '+15550001' },
    { id: B_ID, name: 'B Co', slug: 'biz-b', status: 'active', phone: '+15550002' },
  ])
  // Same PIN reused across two tenants — a realistic collision since PINs are
  // short, tenant-local codes, not globally unique.
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, name: 'Worker A', pin: SHARED_PIN, status: 'active', preferred_language: 'en', pay_rate: 20, avatar_url: null, role: 'worker' },
    { id: 'tm-b', tenant_id: B_ID, name: 'Worker B', pin: SHARED_PIN, status: 'active', preferred_language: 'en', pay_rate: 25, avatar_url: null, role: 'worker' },
  ])
})

function req(tenant_slug: string, pin: string): Request {
  return new Request('http://x/api/team-portal/auth', {
    method: 'POST',
    body: JSON.stringify({ tenant_slug, pin }),
  })
}

describe('team-portal/auth POST — tenantDb isolation', () => {
  it("logs in tenant A's worker for tenant A's slug, even though tenant B has a worker sharing the same PIN", async () => {
    const res = await POST(req('biz-a', SHARED_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-a')
    expect(body.member.name).toBe('Worker A')
    expect(body.tenant.id).toBe(A_ID)
  })

  it("logs in tenant B's worker for tenant B's slug with the same PIN, never returning tenant A's member", async () => {
    const res = await POST(req('biz-b', SHARED_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-b')
    expect(body.member.name).toBe('Worker B')
    expect(body.tenant.id).toBe(B_ID)
  })
})

describe('LEAK CONTROL', () => {
  it("looking up team_members by pin+status ALONE (no tenant_id filter) WOULD match both tenants' colliding rows — proves the route's tenantDb scoping on PIN lookup is load-bearing", async () => {
    const { data, error } = await supabaseAdmin
      .from('team_members') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('id, tenant_id')
      .eq('pin', SHARED_PIN)
      .eq('status', 'active')
    expect(error).toBeNull()
    const rows = (data ?? []) as { id: string; tenant_id: string }[]
    expect(rows.map((r) => r.tenant_id).sort()).toEqual([A_ID, B_ID].sort())
  })
})
