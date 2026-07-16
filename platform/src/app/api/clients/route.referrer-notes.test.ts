import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/clients — notes/referrer_id mutation + FK-ownership probe.
 * BookingsAdmin.tsx's "new client" modal collects both a free-text notes
 * textarea and a "Referred By" dropdown (this tenant's own referrers), but
 * validate()'s schema here never included either field, so they were
 * silently dropped before the insert. Fixing the drop also required adding
 * a tenant-ownership check on referrer_id: client-analytics' `referrers(name,
 * ref_code)` embed off clients.referrer_id has no tenant filter on the
 * referrers side, so an unverified foreign id would leak that other
 * tenant's referrer into this tenant's analytics.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    require_client_phone: false,
    require_client_email: false,
    default_client_status: 'active',
  }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const REF_A = '55555555-5555-5555-5555-555555555555'
const REF_B = '66666666-6666-6666-6666-666666666666'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('referrers', [
    { id: REF_A, tenant_id: A_ID, name: 'Referrer A' },
    { id: REF_B, tenant_id: B_ID, name: 'Referrer B' },
  ])
})

describe('POST /api/clients — notes + referrer_id persist', () => {
  it('notes and a tenant-owned referrer_id both saved, not silently dropped', async () => {
    const req = new Request('http://x/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane Doe', notes: 'Prefers morning slots', referrer_id: REF_A }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client.notes).toBe('Prefers morning slots')
    expect(body.client.referrer_id).toBe(REF_A)
  })

  it("rejects a referrer_id belonging to another tenant -- otherwise that stranger's referrer name/ref_code would leak into this tenant's analytics embed", async () => {
    const req = new Request('http://x/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane Doe', referrer_id: REF_B }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(fake._all('clients').some((c) => c.referrer_id === REF_B)).toBe(false)
  })
})
