import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — social/posts/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, even
 * though the dashboard nav gates the Social page under Marketing on
 * campaigns.view. Any authenticated tenant member — including staff, which
 * has no campaigns.view per rbac.ts — could read every social post. Proves
 * GET now requires campaigns.view and short-circuits when denied.
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
import { GET as postsGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/social/posts — campaigns.view permission gate', () => {
  it('allowed with campaigns.view, forbidden without', async () => {
    const ok = await postsGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await postsGET()
    expect(denied.status).toBe(403)
  })
})
