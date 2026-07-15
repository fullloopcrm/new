import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — crews/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, unlike
 * its own POST/PATCH/DELETE siblings which already require team.edit — any
 * authenticated tenant member, including staff, could list every crew and
 * its member roster (team member names) even if the tenant's own RBAC
 * customization revoked team.view. Proves GET now requires team.view and
 * short-circuits when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
}))

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'staff', userId: 'u1' }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as crewsGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/crews — team.view permission gate', () => {
  it('allowed with team.view, forbidden without', async () => {
    const ok = await crewsGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await crewsGET()
    expect(denied.status).toBe(403)
  })
})
