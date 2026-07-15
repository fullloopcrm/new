import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — GET /api/notifications.
 * The route called getTenantForRequest() with zero permission check even
 * though notifications.view exists in the RBAC catalog and a tenant can
 * revoke it from staff/manager via a role_permissions override. Without the
 * gate, a role with notifications.view revoked could still hit this API
 * directly and read every admin notification. POST (event ingestion) is
 * left ungated intentionally -- it is an internal workflow write, not a
 * data read the tenant can restrict via the permission catalog.
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
import { GET as notificationsGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/notifications — notifications.view permission gate', () => {
  it('allowed with notifications.view, forbidden without', async () => {
    const ok = await notificationsGET(new NextRequest('http://x/api/notifications'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await notificationsGET(new NextRequest('http://x/api/notifications'))
    expect(denied.status).toBe(403)
  })
})
