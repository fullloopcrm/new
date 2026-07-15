import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — GET /api/reviews.
 * Called getTenantForRequest() directly with zero permission check, unlike
 * PUT /api/reviews/[id] (already gated reviews.request). 'reviews.view' is a
 * real overridable permission in rbac.ts (every default role has it, but a
 * tenant admin can revoke it per-role via settings/permissions) — an override
 * revoking staff's reviews.view was silently ignored here, same asymmetric-
 * gating class fixed repeatedly this session (GET /api/team, GET /api/catalog,
 * GET /api/selena, GET /api/attribution, GET /api/google/reviews, …).
 * Proves GET now requires reviews.view and short-circuits when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

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
import { GET as reviewsGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  fake._seed('reviews', [
    { id: 'r-1', tenant_id: TENANT_ID, rating: 5, comment: 'Great', status: 'published' },
  ])
})

describe('GET /api/reviews — reviews.view permission gate', () => {
  it('allowed with reviews.view, forbidden without', async () => {
    const ok = await reviewsGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await reviewsGET()
    expect(denied.status).toBe(403)
  })
})
