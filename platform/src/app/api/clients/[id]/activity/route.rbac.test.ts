import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Auth gate probe — clients/[id]/activity/route.ts.
 * The route used getCurrentTenant() from '@/lib/tenant', whose header-based
 * branch resolves tenant context purely from the signed x-tenant-id header
 * that middleware injects on EVERY request to a tenant's own domain — it
 * proves the request arrived via that domain, not that the caller is
 * authenticated. That let any unauthenticated internet visitor to a tenant's
 * public domain read a client's full booking history (service notes, exact
 * GPS check-in/check-out coordinates, payment amounts) by guessing/enumerating
 * a client id, with zero login. Fixed by switching to requirePermission
 * ('clients.view'), which requires a real authenticated tenant session and
 * honors per-tenant RBAC overrides. Proves an unauthenticated/unpermitted
 * caller is rejected and never receives the client's activity feed.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

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
const CLIENT_ID = 'client-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request(`http://x/api/clients/${CLIENT_ID}/activity`)
}

function params(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: CLIENT_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane Doe', created_at: '2026-01-01T00:00:00Z' },
  ])
  fake._seed('bookings', [
    {
      id: 'bk-1', tenant_id: TENANT_ID, client_id: CLIENT_ID, team_member_id: null,
      start_time: '2026-02-01T00:00:00Z', status: 'completed', notes: 'Deep clean',
      check_in_location: null, check_out_location: null,
    },
  ])
})

describe('clients/[id]/activity GET — permission gate', () => {
  it('a caller with clients.view sees the activity feed (positive control)', async () => {
    const res = await GET(req(), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((a: { type: string }) => a.type === 'client_created')).toBe(true)
  })

  it('an unauthenticated / clients.view-lacking caller is rejected and gets no client data', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET(req(), params())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(false)
  })
})
