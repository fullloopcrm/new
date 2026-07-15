import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — attribution/route.ts GET + POST.
 * Called getTenantForRequest() directly with zero permission check. GET
 * returns per-booking client name/address (?booking_id=) or tenant-wide
 * revenue-by-domain stats; POST re-runs attribution across every
 * unattributed booking. Any authenticated tenant member — including staff,
 * which has no bookings.view per rbac.ts — could read that PII/revenue data
 * or trigger the mutation. Proves GET now requires bookings.view and POST
 * requires bookings.edit, both short-circuiting when denied.
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
import { GET as attributionGET, POST as attributionPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  // Already-attributed so POST's re-run finds nothing to mutate and returns early.
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: TENANT_ID, price: 100, status: 'completed', attributed_domain: 'good.com', attribution_confidence: 90 },
  ])
})

describe('GET /api/attribution — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const ok = await attributionGET(req('http://x/api/attribution'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await attributionGET(req('http://x/api/attribution'))
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/attribution — bookings.edit permission gate', () => {
  it('allowed with bookings.edit, forbidden without', async () => {
    const ok = await attributionPOST(req('http://x/api/attribution', { method: 'POST' }))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await attributionPOST(req('http://x/api/attribution', { method: 'POST' }))
    expect(denied.status).toBe(403)
  })
})
