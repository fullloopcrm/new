import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — audit/route.ts and security/events/route.ts.
 * Both called getTenantForRequest() directly with zero permission check, while
 * the dashboard nav hides the "Activity" link behind audit.view — meaning
 * staff/manager (who lack audit.view per rbac.ts) could still hit these APIs
 * directly and read the full tenant audit log and security events (logins,
 * password/API-key changes, member add/remove, IPs, user agents).
 * Proves both routes now require audit.view and short-circuit when denied.
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
      : { tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID } }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as auditGET } from './route'
import { GET as securityEventsGET } from '../security/events/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('audit GET — audit.view permission gate', () => {
  it('allowed with audit.view, forbidden without', async () => {
    const ok = await auditGET(new NextRequest('http://x/api/audit'))
    expect(ok.status).toBe(200)

    deny()
    const denied = await auditGET(new NextRequest('http://x/api/audit'))
    expect(denied.status).toBe(403)
  })
})

describe('security/events GET — audit.view permission gate', () => {
  it('allowed with audit.view, forbidden without', async () => {
    permissionError = null
    const ok = await securityEventsGET(new Request('http://x/api/security/events'))
    expect(ok.status).toBe(200)

    deny()
    const denied = await securityEventsGET(new Request('http://x/api/security/events'))
    expect(denied.status).toBe(403)
  })
})
