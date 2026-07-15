import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — settings/page-config/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, unlike
 * every other settings/* GET (settings.view) even though PUT here already
 * requires settings.edit. Any authenticated tenant member — including
 * staff, which has no settings.view per rbac.ts — could read this tenant's
 * per-page dashboard config. Proves GET now requires settings.view and
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
import { GET as pageConfigGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  fake._store.set('tenants', [{ id: TENANT_ID, setup_progress: {} }])
})

describe('GET /api/settings/page-config — settings.view permission gate', () => {
  it('allowed with settings.view, forbidden without', async () => {
    const ok = await pageConfigGET(new NextRequest('http://x/api/settings/page-config?page=team'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await pageConfigGET(new NextRequest('http://x/api/settings/page-config?page=team'))
    expect(denied.status).toBe(403)
  })
})
