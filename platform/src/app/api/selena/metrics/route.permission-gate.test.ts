import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — selena/metrics/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, even
 * though it lives in the same Selena feature area as /api/selena (nav-gated
 * on settings.view). Any authenticated tenant member — including staff,
 * which has no settings.view per rbac.ts — could pull the tenant's Selena
 * scoreboard directly. Proves GET now requires settings.view and
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
import { GET as metricsGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/selena/metrics — settings.view permission gate', () => {
  it('allowed with settings.view, forbidden without', async () => {
    const ok = await metricsGET(new NextRequest('http://x/api/selena/metrics'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await metricsGET(new NextRequest('http://x/api/selena/metrics'))
    expect(denied.status).toBe(403)
  })
})
