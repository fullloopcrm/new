import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/auth/route.ts (docs/adr/0004).
 * send_code resolves tenant from the request's tenant_slug, then scopes the
 * client lookup, the stale-code delete, and the new-code insert to it via
 * tenantDb. verify_code can't know the tenant until AFTER the phone+code
 * lookup resolves it (documented tenant-scope-ok) — but once resolved, the
 * mark-as-used update is scoped via tenantDb too. The LEAK CONTROL proves
 * that scoping is load-bearing: two tenants sharing both the same phone AND
 * the same 6-digit code (a realistic collision) would otherwise let a
 * verify_code call for one tenant silently burn the other tenant's code.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true }),
}))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('./token', () => ({
  generateCode: () => '111111',
  createToken: (clientId: string, tenantId: string) => `tok.${clientId}.${tenantId}`,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const PHONE = '+15550001'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: A_ID, name: 'A Co', slug: 'biz-a', status: 'active', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null },
    { id: B_ID, name: 'B Co', slug: 'biz-b', status: 'active', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null },
  ])
  // Same phone number under both tenants — realistic (a family member cleans
  // for two different businesses) and the case that actually stresses scoping.
  fake._seed('clients', [
    { id: 'client-a', tenant_id: A_ID, phone: PHONE, email: 'a@x.com', name: 'Client A' },
    { id: 'client-b', tenant_id: B_ID, phone: PHONE, email: 'b@x.com', name: 'Client B' },
  ])
})

function sendCodeReq(tenant_slug: string): Request {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'send_code', phone: PHONE, tenant_slug }),
  })
}

function verifyCodeReq(code: string): Request {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify_code', phone: PHONE, code }),
  })
}

describe('portal/auth send_code — tenantDb isolation', () => {
  it("resolves the client and stamps the new code under tenant A only, never touching tenant B's row for the same phone", async () => {
    fake._seed('portal_auth_codes', [
      { id: 'stale-b', tenant_id: B_ID, phone: PHONE, code: '999999', client_id: 'client-b', used: false, expires_at: '2099-01-01T00:00:00Z', created_at: '2026-07-01T00:00:00Z' },
    ])
    const res = await POST(sendCodeReq('biz-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ sent: true, channel: 'email' })

    const codes = fake._all('portal_auth_codes')
    const aCode = codes.find((c) => c.client_id === 'client-a')
    expect(aCode?.tenant_id).toBe(A_ID)
    // Tenant B's unrelated stale code is untouched by A's "delete existing
    // unused codes for this phone" step.
    const bCode = codes.find((c) => c.id === 'stale-b')
    expect(bCode?.used).toBe(false)
  })
})

describe('portal/auth verify_code — tenantDb isolation', () => {
  beforeEach(() => {
    // Deliberate collision: same phone AND same code value under both
    // tenants. code-a is the more recent row, so the phone+code lookup
    // (order by created_at desc, limit 1) resolves to tenant A.
    fake._seed('portal_auth_codes', [
      { id: 'code-b', tenant_id: B_ID, phone: PHONE, code: '111111', client_id: 'client-b', used: false, expires_at: '2099-01-01T00:00:00Z', created_at: '2026-07-13T00:00:05Z' },
      { id: 'code-a', tenant_id: A_ID, phone: PHONE, code: '111111', client_id: 'client-a', used: false, expires_at: '2099-01-01T00:00:00Z', created_at: '2026-07-13T00:00:10Z' },
    ])
  })

  it("marks only tenant A's code as used via tenantDb, leaving tenant B's colliding phone+code row untouched", async () => {
    const res = await POST(verifyCodeReq('111111'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('tok.client-a.tenant-A')

    const codes = fake._all('portal_auth_codes')
    expect(codes.find((c) => c.id === 'code-a')?.used).toBe(true)
    expect(codes.find((c) => c.id === 'code-b')?.used).toBe(false)
  })
})

describe('LEAK CONTROL', () => {
  it("updating portal_auth_codes by phone+code ALONE (no tenant_id filter) WOULD mark BOTH tenants' colliding rows as used — proves the route's tenantDb scoping on mark-as-used is load-bearing", async () => {
    fake._seed('portal_auth_codes', [
      { id: 'code-b', tenant_id: B_ID, phone: PHONE, code: '111111', client_id: 'client-b', used: false, expires_at: '2099-01-01T00:00:00Z', created_at: '2026-07-13T00:00:05Z' },
      { id: 'code-a', tenant_id: A_ID, phone: PHONE, code: '111111', client_id: 'client-a', used: false, expires_at: '2099-01-01T00:00:00Z', created_at: '2026-07-13T00:00:10Z' },
    ])
    await supabaseAdmin
      .from('portal_auth_codes') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .update({ used: true })
      .eq('phone', PHONE)
      .eq('code', '111111')
    const codes = fake._all('portal_auth_codes')
    expect(codes.find((c) => c.id === 'code-a')?.used).toBe(true)
    expect(codes.find((c) => c.id === 'code-b')?.used).toBe(true)
  })
})
