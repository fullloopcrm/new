/**
 * GET /api/team-availability gated on getCurrentTenant() -- which resolves
 * for ANY visitor on a tenant's own domain via middleware's signed
 * x-tenant-id header, not just a logged-in dashboard session. An anonymous
 * website visitor could pull internal scheduling data (team member skills,
 * workload, a specific client's preferred-cleaner assignment) with zero
 * authentication. Fix requires an authenticated dashboard session with
 * bookings.view (requirePermission).
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/availability', () => ({
  checkTeamAvailability: vi.fn().mockResolvedValue([{ id: 'tm-1', available: true }]),
}))

const h = vi.hoisted(() => ({ requirePermission: vi.fn() }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { GET } from './route'

function req(qs: string) {
  return new NextRequest(`http://test.local/api/team-availability?${qs}`)
}

describe('GET /api/team-availability — auth gate', () => {
  it('rejects an anonymous/unauthenticated caller', async () => {
    h.requirePermission.mockReset()
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const res = await GET(req('date=2026-03-15'))
    expect(res.status).toBe(401)
  })

  it('returns availability once an authenticated, permitted session is present', async () => {
    h.requirePermission.mockReset()
    h.requirePermission.mockResolvedValueOnce({ tenant: { tenantId: 'tenant-a' }, error: null })
    const res = await GET(req('date=2026-03-15'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.members).toHaveLength(1)
  })
})
