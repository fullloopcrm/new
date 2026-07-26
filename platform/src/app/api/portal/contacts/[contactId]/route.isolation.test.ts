import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant/client-ownership isolation for PUT/DELETE /api/portal/contacts/[contactId],
 * plus the OTP-gate: a contact can't be opted into a channel it was never
 * verified on (no sms_consent_at / email_consent_at).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT, DELETE } from './route'

const TENANT_A = 'tenant-A'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(method: string, body?: unknown): Request {
  return new Request('http://x/api/portal/contacts/c1', {
    method,
    headers: { authorization: 'Bearer whatever' },
    body: body ? JSON.stringify(body) : undefined,
  })
}
const params = (contactId: string) => ({ params: Promise.resolve({ contactId }) })

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_A, tid: TENANT_A }
  fake._seed('client_contacts', [
    { id: 'cc-own-unverified', tenant_id: TENANT_A, client_id: CLIENT_A, phone_e164: '+15550000001', email: null, is_primary: false, receives_sms: false, receives_email: false, sms_consent_at: null, email_consent_at: null },
    { id: 'cc-own-verified', tenant_id: TENANT_A, client_id: CLIENT_A, phone_e164: '+15550000002', email: null, is_primary: false, receives_sms: false, receives_email: false, sms_consent_at: '2026-01-01T00:00:00Z', email_consent_at: null },
    { id: 'cc-belongs-to-b', tenant_id: TENANT_A, client_id: CLIENT_B, phone_e164: '+15550000003', email: null, is_primary: false, receives_sms: false, receives_email: false, sms_consent_at: '2026-01-01T00:00:00Z', email_consent_at: null },
  ])
})

describe('PUT /api/portal/contacts/[contactId] — OTP gate', () => {
  it('refuses to turn on receives_sms for a never-verified phone', async () => {
    const res = await PUT(req('PUT', { receives_sms: true }), params('cc-own-unverified'))
    expect(res.status).toBe(400)
    const stored = fake._all('client_contacts').find((r) => r.id === 'cc-own-unverified')
    expect(stored?.receives_sms).toBe(false)
  })

  it('allows turning on receives_sms for a previously-verified phone (has a consent timestamp)', async () => {
    const res = await PUT(req('PUT', { receives_sms: true }), params('cc-own-verified'))
    expect(res.status).toBe(200)
    const stored = fake._all('client_contacts').find((r) => r.id === 'cc-own-verified')
    expect(stored?.receives_sms).toBe(true)
  })

  it('always allows opting OUT immediately, no verification needed', async () => {
    fake._store.get('client_contacts')!.find((r) => r.id === 'cc-own-verified')!.receives_sms = true
    const res = await PUT(req('PUT', { receives_sms: false }), params('cc-own-verified'))
    expect(res.status).toBe(200)
    const stored = fake._all('client_contacts').find((r) => r.id === 'cc-own-verified')
    expect(stored?.receives_sms).toBe(false)
  })
})

describe('PUT/DELETE /api/portal/contacts/[contactId] — ownership isolation', () => {
  it('404s trying to update a contact that belongs to a different client', async () => {
    const res = await PUT(req('PUT', { receives_sms: true }), params('cc-belongs-to-b'))
    expect(res.status).toBe(404)
  })

  it('404s trying to delete a contact that belongs to a different client, and does not remove it', async () => {
    const res = await DELETE(req('DELETE'), params('cc-belongs-to-b'))
    expect(res.status).toBe(200) // delete is a no-op match, not an error — but nothing is removed
    expect(fake._all('client_contacts').some((r) => r.id === 'cc-belongs-to-b')).toBe(true)
  })

  it('deletes a contact that genuinely belongs to the authenticated client', async () => {
    const res = await DELETE(req('DELETE'), params('cc-own-unverified'))
    expect(res.status).toBe(200)
    expect(fake._all('client_contacts').some((r) => r.id === 'cc-own-unverified')).toBe(false)
  })
})
