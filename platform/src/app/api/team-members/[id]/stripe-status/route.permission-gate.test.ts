import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — team-members/[id]/stripe-status/route.ts
 * GET + POST. Both called getTenantForRequest() directly with zero
 * permission check, unlike the sibling stripe-onboard route (gated on
 * team.edit). Any authenticated tenant member — including staff, which has
 * no team.edit per rbac.ts — could trigger a live Stripe status refresh
 * (flipping the team member's ready flag + firing admin notifications) or
 * read the live Stripe account status. Proves GET now requires team.view and
 * POST requires team.edit, both short-circuiting when denied.
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
import { GET as stripeStatusGET, POST as stripeStatusPOST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

const params = Promise.resolve({ id: 'tm-1' })

describe('GET /api/team-members/[id]/stripe-status — team.view permission gate', () => {
  it('allowed with team.view, forbidden without', async () => {
    const ok = await stripeStatusGET(new NextRequest('http://x/api/team-members/tm-1/stripe-status'), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await stripeStatusGET(new NextRequest('http://x/api/team-members/tm-1/stripe-status'), { params })
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/team-members/[id]/stripe-status — team.edit permission gate', () => {
  it('allowed with team.edit, forbidden without', async () => {
    const ok = await stripeStatusPOST(new NextRequest('http://x/api/team-members/tm-1/stripe-status', { method: 'POST' }), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await stripeStatusPOST(new NextRequest('http://x/api/team-members/tm-1/stripe-status', { method: 'POST' }), { params })
    expect(denied.status).toBe(403)
  })
})
