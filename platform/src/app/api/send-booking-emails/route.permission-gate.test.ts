import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — send-booking-emails/route.ts POST.
 * Called getTenantForRequest() directly with zero permission check, even
 * though it's a resend-confirmation mutation exposed from the Bookings admin
 * panel (nav-gated on bookings.view). Any authenticated tenant member —
 * including staff, if the tenant's own RBAC customization revokes
 * bookings.edit — could trigger client/team notification resends. Proves
 * POST now requires bookings.edit and short-circuits when denied.
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
import { POST as sendBookingEmailsPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('POST /api/send-booking-emails — bookings.edit permission gate', () => {
  it('allowed with bookings.edit, forbidden without', async () => {
    const req = () => new Request('http://x/api/send-booking-emails', {
      method: 'POST',
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const ok = await sendBookingEmailsPOST(req())
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await sendBookingEmailsPOST(req())
    expect(denied.status).toBe(403)
  })
})
