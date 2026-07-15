import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — bookings/route.ts and bookings/[id]/route.ts GET.
 * Both called getTenantForRequest() directly with zero permission check, unlike
 * their own PUT/DELETE siblings (bookings.edit/bookings.delete) and POST
 * (bookings.create). Any authenticated tenant member — regardless of the
 * tenant's own RBAC customization of bookings.view — could list every booking
 * (with joined client name/phone/address/email and team member phone/email)
 * or read a single booking by id. Proves both GETs now require bookings.view
 * and short-circuit when denied.
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
import { GET as bookingsGET } from './route'
import { GET as bookingGET } from './[id]/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/bookings — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const ok = await bookingsGET(new NextRequest('http://x/api/bookings'))
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await bookingsGET(new NextRequest('http://x/api/bookings'))
    expect(denied.status).toBe(403)
  })
})

describe('GET /api/bookings/[id] — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const params = Promise.resolve({ id: 'booking-1' })
    const ok = await bookingGET(new Request('http://x/api/bookings/booking-1'), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await bookingGET(new Request('http://x/api/bookings/booking-1'), { params })
    expect(denied.status).toBe(403)
  })
})
