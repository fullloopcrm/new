import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/rating/route.ts (docs/adr/0004).
 * auth.id/auth.tid come from requirePortalPermission (verified bearer token),
 * so there is no caller-suppliable cross-tenant id. Defense-in-depth only; the
 * LEAK CONTROL case proves the store itself has no implicit tenant scoping.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string; role: string } | null
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () =>
    currentAuth
      ? { auth: currentAuth, error: null }
      : { auth: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: 'tm-a', tid: A_ID, role: 'worker' }
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, avg_rating: 4.8, rating_count: 20 },
    { id: 'tm-b', tenant_id: B_ID, avg_rating: 2.1, rating_count: 5 },
  ])
})

describe('team-portal/rating GET — tenantDb isolation', () => {
  it("worker A's own token reads tenant A's rating (positive control)", async () => {
    const res = await GET(new Request('http://x') as any)
    const body = await res.json()
    expect(body.avg).toBe(4.8)
    expect(body.count).toBe(20)
  })

  it("LEAK CONTROL: selecting team_members by id ALONE (no tenant_id filter) WOULD return tenant B's rating for B's id — proves the route's tenantDb scoping is load-bearing, not the table", async () => {
    const { data } = await supabaseAdmin
      .from('team_members')
      .select('avg_rating, rating_count')
      .eq('id', 'tm-b')
      .maybeSingle()
    expect((data as { avg_rating: number }).avg_rating).toBe(2.1)
  })
})
