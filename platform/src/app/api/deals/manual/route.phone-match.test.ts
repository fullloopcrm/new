import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * deals/manual's client dedupe previously matched on ilike('phone', `%last10%`)
 * gated only by cleanPhone.length >= 7 -- a short/partial phone entry (staff
 * typo or fragment) would substring-match an ARBITRARY unrelated client,
 * silently attaching the new lead/deal to the wrong client. Fixed to require
 * a full exact 10-digit match, mirroring client/collect.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_A = 'tenant-A'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({ success: true }) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: 'client-unrelated', tenant_id: TENANT_A, name: 'Unrelated Client', phone: '15165550123' },
  ])
})

describe('deals/manual POST — phone dedupe must be an exact 10-digit match', () => {
  it('a short/partial phone (7 digits) does NOT attach the new lead to an unrelated client sharing that substring', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Lead', phone: '5550123', email: 'new-lead@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.client_id).not.toBe('client-unrelated')
  })

  it('a full matching 10-digit phone DOES attach to the existing client (positive control)', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'Unrelated Client', phone: '5165550123', email: 'unrelated@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.client_id).toBe('client-unrelated')
  })
})
