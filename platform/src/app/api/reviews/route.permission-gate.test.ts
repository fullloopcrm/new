import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — POST /api/reviews and POST /api/reviews/request.
 * Both called getTenantForRequest() directly with zero permission check, unlike
 * their siblings (PUT /api/reviews/[id], /api/google/reviews, /api/admin/reviews)
 * which correctly gate on reviews.request. 'staff' (the default role) has
 * reviews.view but NOT reviews.request per rbac.ts, so this let any tenant
 * member fabricate arbitrary review records (rating/status/comment/source —
 * e.g. status: 'published') via POST /api/reviews, or trigger a client-facing
 * email/SMS review-request send (burning the tenant's Resend/Telnyx credits)
 * via POST /api/reviews/request, bypassing the same permission the edit path
 * enforces.
 * Proves both routes now require reviews.request and short-circuit when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/audit', () => ({ audit: async () => ({}) }))

const TENANT_ID = 'tenant-A'
const TENANT_ROW = { id: TENANT_ID, name: 'Acme Cleaning', google_place_id: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null }
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID, tenant: TENANT_ROW }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST as reviewsPOST } from './route'
import { POST as reviewRequestPOST } from './request/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  fake._store.set('clients', [
    { id: 'client-1', tenant_id: TENANT_ID, name: 'Jane Doe', email: null, phone: null },
    { id: '11111111-1111-1111-1111-111111111111', tenant_id: TENANT_ID, name: 'John Roe', email: null, phone: null },
  ])
})

describe('POST /api/reviews — reviews.request permission gate', () => {
  it('allowed with reviews.request, forbidden without', async () => {
    const ok = await reviewsPOST(new Request('http://x/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ client_id: '11111111-1111-1111-1111-111111111111', rating: 5, comment: 'Great', source: 'internal', status: 'published' }),
    }))
    expect(ok.status).toBe(201)

    deny()
    const denied = await reviewsPOST(new Request('http://x/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ client_id: '11111111-1111-1111-1111-111111111111', rating: 5, comment: 'Great', source: 'internal', status: 'published' }),
    }))
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/reviews/request — reviews.request permission gate', () => {
  it('allowed with reviews.request, forbidden without', async () => {
    const ok = await reviewRequestPOST(new Request('http://x/api/reviews/request', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'client-1' }),
    }))
    expect(ok.status).toBe(200)

    deny()
    const denied = await reviewRequestPOST(new Request('http://x/api/reviews/request', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'client-1' }),
    }))
    expect(denied.status).toBe(403)
  })
})
