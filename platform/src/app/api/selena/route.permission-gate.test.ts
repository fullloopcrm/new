import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — selena/route.ts GET + POST.
 * This is the live route behind /dashboard/selena (nav-gated on
 * settings.view), yet both called getTenantForRequest() directly with zero
 * permission check. Any authenticated tenant member — including staff, which
 * has no settings.view per rbac.ts — could read every Selena conversation
 * (client name/phone/email/address, ratings, escalation logs) or reset a
 * stuck conversation. Proves GET now requires settings.view and POST
 * requires settings.edit, both short-circuiting when denied.
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
import { GET as selenaGET, POST as selenaPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/selena — settings.view permission gate', () => {
  it('allowed with settings.view, forbidden without', async () => {
    const ok = await selenaGET(new NextRequest('http://x/api/selena'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await selenaGET(new NextRequest('http://x/api/selena'))
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/selena — settings.edit permission gate', () => {
  it('allowed with settings.edit, forbidden without', async () => {
    const req = () => new NextRequest('http://x/api/selena', {
      method: 'POST',
      body: JSON.stringify({ conversationId: 'convo-1' }),
    })

    const ok = await selenaPOST(req())
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await selenaPOST(req())
    expect(denied.status).toBe(403)
  })
})
