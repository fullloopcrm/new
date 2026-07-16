/**
 * SMS-CONVERSATION HIJACK — convo_id is a caller-supplied URL param (from the
 * "finish your booking" SMS link) with no session tied to it. The route used
 * to link/reassign an sms_conversations row purely on
 * .eq('id', convo_id).eq('tenant_id', tenant.id), so anyone who obtained
 * another customer's convo_id (a forwarded link, browser history, a
 * link-preview crawler) could reassign that conversation's client_id to an
 * attacker-controlled client and silently derail the real customer's
 * booking flow. This suite proves a same-tenant convo_id can only be linked
 * when the submitter's phone matches the conversation's own phone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: { id: string; name: string; primary_color?: string | null; logo_url?: string | null }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => ({}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 'x', html: 'x' }) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-1'
const CONVO_ID = 'convo-real-customer'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: TENANT_ID, name: 'Test Tenant' }
  fake._seed('clients', [])
  fake._seed('sms_conversations', [
    { id: CONVO_ID, tenant_id: TENANT_ID, phone: '5559991111', client_id: null, state: 'active', completed_at: null },
  ])
})

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/client/collect', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/client/collect — convo_id handoff requires the submitter to own the conversation', () => {
  it('an attacker who only knows the convo_id, not the real phone, cannot hijack it', async () => {
    const res = await POST(postReq({ name: 'Attacker', phone: '5550009999', convo_id: CONVO_ID }))
    expect(res.status).toBe(200)
    const convo = fake._all('sms_conversations').find((c) => c.id === CONVO_ID)!
    expect(convo.client_id).toBeNull()
    expect(convo.state).toBe('active')
  })

  it('the real customer submitting their own matching phone still links the conversation', async () => {
    const res = await POST(postReq({ name: 'Real Customer', phone: '5559991111', convo_id: CONVO_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    const convo = fake._all('sms_conversations').find((c) => c.id === CONVO_ID)!
    expect(convo.client_id).toBe(body.client_id)
    expect(convo.state).toBe('form_received')
  })
})
