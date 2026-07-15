import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — schedule/calendar/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, unlike
 * the sibling bookings/jobs GETs (bookings.view). Any authenticated tenant
 * member — regardless of the tenant's own RBAC customization of
 * bookings.view — could load the full calendar view (client names, prices,
 * team member assignments/utilization). Proves the GET now requires
 * bookings.view and short-circuits when denied.
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
import { GET as calendarGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/schedule/calendar — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const ok = await calendarGET(new NextRequest('http://x/api/schedule/calendar'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await calendarGET(new NextRequest('http://x/api/schedule/calendar'))
    expect(denied.status).toBe(403)
  })
})
