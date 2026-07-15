import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — GET /api/google/reviews.
 * Called getTenantForRequest() directly with zero permission check, unlike
 * sibling POST/PUT on this same route (already gated reviews.request /
 * settings.integrations). 'reviews.view' is a real overridable permission in
 * rbac.ts (every default role has it, but a tenant admin can revoke it
 * per-role via settings/permissions) — an override revoking staff's
 * reviews.view was silently ignored here, same asymmetric-gating class fixed
 * repeatedly this session. Proves GET now requires reviews.view and
 * short-circuits when denied.
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
import { GET as googleReviewsGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  fake._seed('tenants', [{ id: TENANT_ID, google_business: null }])
  fake._seed('google_reviews', [
    { id: 'gr-1', tenant_id: TENANT_ID, reviewer_name: 'Jane', rating: 5, comment: 'Great' },
  ])
  fake._seed('tenant_settings', [{ tenant_id: TENANT_ID, google_auto_reply: false }])
})

describe('GET /api/google/reviews — reviews.view permission gate', () => {
  it('allowed with reviews.view, forbidden without', async () => {
    const ok = await googleReviewsGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await googleReviewsGET()
    expect(denied.status).toBe(403)
  })
})
