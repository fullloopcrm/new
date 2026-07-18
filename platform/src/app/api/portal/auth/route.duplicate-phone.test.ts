/**
 * PORTAL-AUTH SEND_CODE DUPLICATE PHONE — clients.phone has no uniqueness
 * constraint (idx_clients_tenant_phone is a plain index, not unique). The
 * `clients` lookup in `send_code` used `.eq('phone', phone).single()`
 * directly — `.single()` errors when 2+ rows match, and since the error
 * wasn't checked, `client` fell back to null and a legitimate client with
 * any duplicate phone row got a permanent 404 "No account found with this
 * phone number," locked out of self-service portal login entirely (same
 * failure class as webhooks/telnyx/route.ts's findByPhone, and the same
 * "legitimate user locked out of self-service" shape as the pin-reset fix
 * earlier this session).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'em_1' })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const PHONE = '+15551234567'
const TENANT_ID = 'tenant-1'
const TENANT_SLUG = 'test-tenant'

function seed(clients: Partial<Row>[]) {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID, slug: TENANT_SLUG, status: 'active', name: 'Test Tenant',
      telnyx_api_key: 'key', telnyx_phone: '+18005551000', resend_api_key: 'k',
    },
  ])
  fake._seed('clients', clients)
  fake._seed('portal_auth_codes', [])
}

function sendCodeReq() {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'send_code', phone: PHONE, tenant_slug: TENANT_SLUG }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'portal-test-secret'
})

describe('POST /api/portal/auth send_code — duplicate clients.phone rows', () => {
  it('still finds the client (not a 404) when two clients in the same tenant share a phone', async () => {
    seed([
      { id: 'client-1', tenant_id: TENANT_ID, name: 'First Client', phone: PHONE, email: 'c1@x.com' },
      { id: 'client-2', tenant_id: TENANT_ID, name: 'Duplicate Client', phone: PHONE, email: 'c2@x.com' },
    ])

    const res = await POST(sendCodeReq())
    const body = await res.json()

    // Before the fix: .single() errored on the 2-row match, client resolved
    // to null, and this legitimate client got a permanent 404 lockout.
    expect(res.status).toBe(200)
    expect(body.sent).toBe(true)

    const code = fake._all('portal_auth_codes')[0]
    expect(code).toBeTruthy()
    expect(['client-1', 'client-2']).toContain(code.client_id)
  })

  it('a genuinely unmatched phone still 404s (0-row case unaffected)', async () => {
    seed([{ id: 'client-1', tenant_id: TENANT_ID, name: 'Someone Else', phone: '+15559999999', email: null }])

    const res = await POST(sendCodeReq())
    expect(res.status).toBe(404)
  })
})
