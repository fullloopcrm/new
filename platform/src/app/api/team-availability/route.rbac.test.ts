import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Auth gate probe — team-availability/route.ts.
 * The route used getCurrentTenant() from '@/lib/tenant', whose header-based
 * branch resolves tenant context purely from the signed x-tenant-id header
 * that middleware injects on EVERY request to a tenant's own domain — it
 * proves the request arrived via that domain, not that the caller is
 * authenticated. That let any unauthenticated internet visitor to a tenant's
 * public domain enumerate team member names/skills, per-client scheduling
 * preferences, and staff workload for any date, with zero login. Fixed by
 * switching to requirePermission('bookings.edit'), which requires a real
 * authenticated tenant session and honors per-tenant RBAC overrides. Proves
 * an unauthenticated/unpermitted caller is rejected and never receives
 * availability data.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/availability', () => ({
  checkTeamAvailability: vi.fn(async () => [
    { id: 'member-1', name: 'Alex', available: true },
  ]),
}))

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(): NextRequest {
  return new NextRequest('http://x/api/team-availability?date=2026-03-15&start_time=10:00&duration=2')
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('team_members', [
    { id: 'member-1', tenant_id: TENANT_ID, status: 'active', skills: [] },
  ])
  fake._seed('bookings', [])
})

describe('team-availability GET — permission gate', () => {
  it('a caller with bookings.edit sees availability data (positive control)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.members)).toBe(true)
    expect(body.members.length).toBe(1)
  })

  it('an unauthenticated / bookings.edit-lacking caller is rejected and gets no availability data', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET(req())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.members).toBeUndefined()
  })
})
