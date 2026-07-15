import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — GET /api/dashboard.
 * The admin dashboard aggregator called getTenantForRequest() with zero
 * permission check, returning full financials (today/week/month/pending
 * revenue) alongside bookings/clients/team data to any authenticated tenant
 * member -- including staff, who lack finance.view per rbac.ts. Gated on
 * finance.view.
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
import { GET as dashboardGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/dashboard — finance.view permission gate', () => {
  it('allowed with finance.view, forbidden without', async () => {
    const ok = await dashboardGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await dashboardGET()
    expect(denied.status).toBe(403)
  })
})
