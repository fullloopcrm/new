import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — settings/team/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, even
 * though it's a sub-route of /dashboard/settings (nav-gated on
 * settings.view) — it hands back the tenant's team role list and pay-rate
 * schedule. Any authenticated tenant member — including staff, which has
 * no settings.view per rbac.ts — could pull that compensation config.
 * Proves GET now requires settings.view and short-circuits when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({}),
  clearSettingsCache: () => {},
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
import { GET as teamGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/settings/team — settings.view permission gate', () => {
  it('allowed with settings.view, forbidden without', async () => {
    const ok = await teamGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await teamGET()
    expect(denied.status).toBe(403)
  })
})
