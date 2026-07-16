import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — portal/collect/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps referrer lookup
 * (phone/name), client match/insert, and the sms_conversations handoff
 * scoped to the tenant resolved from the request host — even when a foreign
 * tenant has a referrer/conversation with the SAME phone/name/id.
 *
 * The sms_conversations UPDATE previously filtered ONLY by .eq('id', convo_id)
 * with NO tenant_id check on the mutation — tenantDb() closes that gap.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: {
  id: string; name: string; domain?: string | null; slug?: string | null
  primary_color?: string | null; logo_url?: string | null; timezone?: string | null
  telnyx_api_key: string | null; telnyx_phone: string | null
}
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
  tenantSiteUrl: () => 'https://example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => ({}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 'x', html: 'x' }) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => ({}) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: A_ID, name: 'Tenant A Co', telnyx_api_key: null, telnyx_phone: null }
  fake._seed('referrers', [
    { id: 'ref-a', tenant_id: A_ID, name: 'Shared Referrer', phone: '5559990001', active: true },
    { id: 'ref-b', tenant_id: B_ID, name: 'Shared Referrer', phone: '5559990001', active: true },
  ])
  fake._seed('clients', [])
  fake._seed('notifications', [])
  fake._seed('portal_leads', [])
  fake._seed('sms_conversations', [
    { id: 'convo-a', tenant_id: A_ID, completed_at: null, client_id: null, state: 'active', preferred_date: null, preferred_time: null, hourly_rate: null, phone: '5558887777' },
    { id: 'convo-b', tenant_id: B_ID, completed_at: null, client_id: null, state: 'active', preferred_date: null, preferred_time: null, hourly_rate: null, phone: '5556667777' },
  ])
  fake._seed('sms_conversation_messages', [])
})

function postReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x/api/portal/collect', { method: 'POST', body: JSON.stringify(body) })
}

describe('portal/collect POST — tenantDb isolation', () => {
  it("referrer phone lookup matches ONLY the requesting tenant's referrer, not tenant B's identically-phoned one", async () => {
    const res = await POST(postReq({ name: 'New Client', phone: '5551112222', referrer_phone: '5559990001' }))
    expect(res.status).toBe(200)
    const client = fake._all('clients').find((c) => c.name === 'New Client')!
    expect(client.referrer_id).toBe('ref-a')
  })

  it("the new client and portal_lead are stamped with the header-resolved tenant, not a forged one", async () => {
    await POST(postReq({ name: 'Another Client', phone: '5553334444' }))
    const client = fake._all('clients').find((c) => c.name === 'Another Client')!
    expect(client.tenant_id).toBe(A_ID)
    const lead = fake._all('portal_leads').find((l) => l.client_id === client.id)!
    expect(lead.tenant_id).toBe(A_ID)
  })

  it("a convo_id belonging to tenant B is NOT found/linked when the request resolves to tenant A (tenant_id scoping on the sms_conversations lookup)", async () => {
    await POST(postReq({ name: 'Convo Client', phone: '5556667777', convo_id: 'convo-b' }))
    const bConvo = fake._all('sms_conversations').find((c) => c.id === 'convo-b')!
    expect(bConvo.client_id).toBeNull()
    expect(bConvo.state).toBe('active')
  })

  it("a convo_id belonging to the SAME tenant IS linked (positive control)", async () => {
    const res = await POST(postReq({ name: 'Convo Client A', phone: '5558887777', convo_id: 'convo-a' }))
    const body = await res.json()
    const aConvo = fake._all('sms_conversations').find((c) => c.id === 'convo-a')!
    expect(aConvo.client_id).toBe(body.client_id)
    expect(aConvo.state).toBe('form_received')
  })

  it("a same-tenant convo_id whose phone doesn't match the submitter's is NOT linked (hijack guard) -- convo_id is a caller-supplied URL param, so a valid same-tenant id alone must not be enough to take over someone else's conversation", async () => {
    const res = await POST(postReq({ name: 'Attacker', phone: '5551230000', convo_id: 'convo-a' }))
    expect(res.status).toBe(200)
    const aConvo = fake._all('sms_conversations').find((c) => c.id === 'convo-a')!
    expect(aConvo.client_id).toBeNull()
    expect(aConvo.state).toBe('active')
  })

  it("LEAK CONTROL: updating sms_conversations by id ALONE (no tenant_id filter) WOULD let tenant A's request link tenant B's conversation — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('sms_conversations')
      .update({ client_id: 'forged-client' })
      .eq('id', 'convo-b')
      .select()
      .maybeSingle()
    expect((data as { client_id: string } | null)?.client_id).toBe('forged-client')
  })
})
