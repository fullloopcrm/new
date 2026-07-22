import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PATCH /api/referrers/[id] — admin-only Stripe-ineligible flag toggle.
 * Per leader/Jeff 16:55 (CHANNEL.md): the ONLY way a referrer keeps manual
 * Zelle/Apple Cash payout once Connect is mandatory is an explicit admin
 * override on their record, never a default choice.
 */

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-1' as string }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: roleHolder.tenantId, tenant: { id: roleHolder.tenantId }, role: roleHolder.role }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const TENANT = 'tenant-1'
const REFERRER_ID = 'ref-1'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = TENANT
  fake._store.clear()
  fake._seed('referrers', [
    { id: REFERRER_ID, tenant_id: TENANT, name: 'Rex Referrer', stripe_ineligible_at: null },
  ])
})

function patchReq(body: unknown) {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
}

describe('PATCH /api/referrers/[id] — stripe_ineligible flag', () => {
  it('flags a referrer Stripe-ineligible', async () => {
    const res = await PATCH(patchReq({ stripe_ineligible: true }), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referrer.stripe_ineligible_at).not.toBeNull()
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    expect(row.stripe_ineligible_at).not.toBeNull()
  })

  it('un-flags a referrer (clears stripe_ineligible_at)', async () => {
    fake._all('referrers')[0].stripe_ineligible_at = '2026-01-01T00:00:00.000Z'
    const res = await PATCH(patchReq({ stripe_ineligible: false }), { params: Promise.resolve({ id: REFERRER_ID }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referrer.stripe_ineligible_at).toBeNull()
  })

  it('rejects a non-boolean stripe_ineligible', async () => {
    const res = await PATCH(patchReq({ stripe_ineligible: 'yes' }), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(400)
  })

  it('404s for a referrer outside the admin\'s tenant', async () => {
    fake._seed('referrers', [{ id: 'ref-other-tenant', tenant_id: 'tenant-2', name: 'Foreign Ref', stripe_ineligible_at: null }])
    const res = await PATCH(patchReq({ stripe_ineligible: true }), { params: Promise.resolve({ id: 'ref-other-tenant' }) })
    expect(res.status).toBe(404)
  })

  it('rejects a caller without referrals.payout permission', async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(patchReq({ stripe_ineligible: true }), { params: Promise.resolve({ id: REFERRER_ID }) })
    expect(res.status).toBe(403)
    const row = fake._all('referrers').find((r) => r.id === REFERRER_ID)!
    expect(row.stripe_ineligible_at).toBeNull()
  })
})
