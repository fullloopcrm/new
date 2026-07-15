import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — GET /api/bookings/stats and GET
 * /api/bookings/closeout. Both called getTenantForRequest() with zero
 * permission check: stats exposes aggregate monthly revenue, closeout
 * exposes payroll data (hourly_rate/pay_rate/team_pay/payment_method) plus
 * client name/phone/address, to any authenticated tenant member regardless
 * of finance.view. Gated both on finance.view.
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
import { GET as statsGET } from './route'
import { GET as closeoutGET } from '../closeout/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/bookings/stats — finance.view permission gate', () => {
  it('allowed with finance.view, forbidden without', async () => {
    const ok = await statsGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await statsGET()
    expect(denied.status).toBe(403)
  })
})

describe('GET /api/bookings/closeout — finance.view permission gate', () => {
  it('allowed with finance.view, forbidden without', async () => {
    permissionError = null
    const ok = await closeoutGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await closeoutGET()
    expect(denied.status).toBe(403)
  })
})
