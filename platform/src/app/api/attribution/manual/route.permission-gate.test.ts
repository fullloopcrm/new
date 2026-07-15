import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — attribution/manual/route.ts GET + POST.
 * Called getTenantForRequest() directly with zero permission check. GET
 * returns every unattributed-eligible booking's client name/address/phone
 * (the last 20, tenant-wide) and POST mutates a booking's attribution. Any
 * authenticated tenant member — including staff, which has no bookings.view
 * per rbac.ts — could read that PII or forge an attribution + notification.
 * Proves GET now requires bookings.view and POST requires bookings.edit,
 * both short-circuiting when denied.
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
import { GET as manualGET, POST as manualPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: TENANT_ID, start_time: '2026-07-01', created_at: '2026-07-01', price: 100, status: 'scheduled', attributed_domain: null },
  ])
})

describe('GET /api/attribution/manual — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const ok = await manualGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await manualGET()
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/attribution/manual — bookings.edit permission gate', () => {
  it('allowed with bookings.edit, forbidden without', async () => {
    const ok = await manualPOST(postReq({ booking_id: 'bk-a', domain: 'good.com' }))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await manualPOST(postReq({ booking_id: 'bk-a', domain: 'evil.com' }))
    expect(denied.status).toBe(403)
  })
})
