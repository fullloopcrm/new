/**
 * tenantDb conversion probe — portal/auth/route.ts PIN login + request_pin.
 * `login` resolves the tenant from tenant_slug, then scopes the PIN lookup to
 * it via tenantDb. `request_pin` does the same for the phone/email lookup and
 * the PIN update. The LEAK CONTROL proves that scoping is load-bearing: two
 * tenants sharing the same PIN (or the same phone/email — a realistic
 * collision, e.g. a family member who uses two different businesses) must
 * never let a login/reset for one tenant resolve to the other tenant's client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 99 }),
}))

const sendEmailMock = vi.fn(async (_opts: { to: string; html: string; subject: string }) => ({}))
vi.mock('@/lib/email', () => ({
  sendEmail: (opts: { to: string; html: string; subject: string }) => sendEmailMock(opts),
  tenantSender: () => 'Full Loop <hello@fullloopcrm.com>',
}))

vi.mock('./token', () => ({
  generateCode: () => '777777',
  createToken: (clientId: string, tenantId: string) => `tok.${clientId}.${tenantId}`,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_PIN = '111111'
const SHARED_PHONE = '+15550001'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  sendEmailMock.mockClear()
  fake._seed('tenants', [
    { id: A_ID, name: 'A Co', slug: 'biz-a', status: 'active', primary_color: null, logo_url: null, email_from: null, resend_api_key: null },
    { id: B_ID, name: 'B Co', slug: 'biz-b', status: 'active', primary_color: null, logo_url: null, email_from: null, resend_api_key: null },
  ])
  // Deliberate collision: same PIN and same phone under both tenants.
  fake._seed('clients', [
    { id: 'client-a', tenant_id: A_ID, phone: SHARED_PHONE, email: 'a@x.com', name: 'Client A', pin: SHARED_PIN },
    { id: 'client-b', tenant_id: B_ID, phone: SHARED_PHONE, email: 'b@x.com', name: 'Client B', pin: SHARED_PIN },
  ])
})

function loginReq(tenant_slug: string) {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', pin: SHARED_PIN, tenant_slug }),
  })
}

function requestPinReq(tenant_slug: string) {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'request_pin', contact: SHARED_PHONE, tenant_slug }),
  })
}

describe('portal/auth login — tenantDb isolation', () => {
  it('a shared PIN across two tenants resolves to the client under the REQUESTED tenant only', async () => {
    const res = await POST(loginReq('biz-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('tok.client-a.tenant-A')
  })
})

describe('portal/auth request_pin — tenantDb isolation', () => {
  it("resets tenant A's client PIN only, leaving tenant B's colliding-phone client untouched", async () => {
    const res = await POST(requestPinReq('biz-a'))
    expect(res.status).toBe(200)

    const clients = fake._all('clients')
    expect(clients.find((c) => c.id === 'client-a')?.pin).toBe('777777')
    expect(clients.find((c) => c.id === 'client-b')?.pin).toBe(SHARED_PIN)
  })
})

describe('LEAK CONTROL', () => {
  it('looking up clients by phone ALONE (no tenant filter) WOULD return BOTH tenants — proves the route\'s tenantDb scoping is load-bearing', async () => {
    const { data } = await supabaseAdmin
      .from('clients') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe
      .select('id, tenant_id')
      .eq('phone', SHARED_PHONE)
    expect((data as { id: string }[]).map((r) => r.id).sort()).toEqual(['client-a', 'client-b'])
  })
})
