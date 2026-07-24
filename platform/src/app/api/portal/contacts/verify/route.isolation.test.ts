import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * OTP verify-flow isolation: a portal token can only send/confirm a code for
 * a contact_id that belongs to ITS OWN client — not a same-tenant sibling
 * client's contact, and confirming never flips receives_sms/receives_email
 * on the wrong row.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 99 }),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => {}),
  tenantSender: () => 'Test <no-reply@example.com>',
}))

let currentAuth: { id: string; tid: string } | null
let fixedCode = '123456'
vi.mock('../../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
  generateCode: () => fixedCode,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_A = 'tenant-A'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown): Request {
  return new Request('http://x/api/portal/contacts/verify', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_A, tid: TENANT_A }
  fixedCode = '123456'
  fake._seed('tenants', [
    { id: TENANT_A, name: 'Test Co', slug: 'test-co', telnyx_api_key: 'k', telnyx_phone: '+15551110000', resend_api_key: 'r' },
  ])
  fake._seed('client_contacts', [
    { id: 'cc-own', tenant_id: TENANT_A, client_id: CLIENT_A, phone_e164: '+15550000001', email: null, receives_sms: false, sms_consent_at: null },
    { id: 'cc-other-client', tenant_id: TENANT_A, client_id: CLIENT_B, phone_e164: '+15550000002', email: null, receives_sms: false, sms_consent_at: null },
  ])
})

describe('POST /api/portal/contacts/verify — ownership isolation', () => {
  it('404s send_code for a contact belonging to a different client', async () => {
    const res = await POST(req({ action: 'send_code', contact_id: 'cc-other-client', channel: 'sms' }) as never)
    expect(res.status).toBe(404)
    expect(fake._all('portal_contact_verify_codes')).toHaveLength(0)
  })
})

describe('POST /api/portal/contacts/verify — send + confirm flow', () => {
  it('send_code stores a code scoped to the right contact/client/tenant', async () => {
    const res = await POST(req({ action: 'send_code', contact_id: 'cc-own', channel: 'sms' }) as never)
    expect(res.status).toBe(200)
    const codes = fake._all('portal_contact_verify_codes')
    expect(codes).toHaveLength(1)
    expect(codes[0]).toMatchObject({ contact_id: 'cc-own', client_id: CLIENT_A, channel: 'sms', used: false })
  })

  it('confirm_code flips receives_sms + stamps sms_consent_at on success', async () => {
    await POST(req({ action: 'send_code', contact_id: 'cc-own', channel: 'sms' }) as never)
    const res = await POST(req({ action: 'confirm_code', contact_id: 'cc-own', channel: 'sms', code: fixedCode }) as never)
    expect(res.status).toBe(200)
    const contact = fake._all('client_contacts').find((r) => r.id === 'cc-own')
    expect(contact?.receives_sms).toBe(true)
    expect(contact?.sms_consent_at).toBeTruthy()
  })

  it('rejects the wrong code and does not flip receives_sms', async () => {
    await POST(req({ action: 'send_code', contact_id: 'cc-own', channel: 'sms' }) as never)
    const res = await POST(req({ action: 'confirm_code', contact_id: 'cc-own', channel: 'sms', code: '000000' }) as never)
    expect(res.status).toBe(401)
    const contact = fake._all('client_contacts').find((r) => r.id === 'cc-own')
    expect(contact?.receives_sms).toBe(false)
  })
})
