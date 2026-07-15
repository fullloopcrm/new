/**
 * COLLECT-FORM CROSS-CLIENT CORRUPTION — same bug as client/collect: the
 * existing-client lookup matched on `ilike('phone', '%'+last10digits+'%')`
 * with no minimum-length guard, so a short/malformed phone (e.g. "5")
 * matched an ARBITRARY unrelated client and the route wrote the submitter's
 * name/email/address/notes/status onto that client's row. This suite proves
 * a short phone can no longer resolve to an unrelated client, while a real
 * matching phone still correctly updates the same client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: {
  id: string; name: string; telnyx_api_key: string | null; telnyx_phone: string | null
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

const TENANT_ID = 'tenant-1'
const UNRELATED_ID = 'unrelated-client'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: TENANT_ID, name: 'Test Tenant', telnyx_api_key: null, telnyx_phone: null }
  fake._seed('clients', [
    { id: UNRELATED_ID, tenant_id: TENANT_ID, name: 'Existing Unrelated Client', phone: '5551234567', email: 'existing@x.com', status: 'active' },
  ])
  fake._seed('portal_leads', [])
  fake._seed('notifications', [])
})

function postReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x/api/portal/collect', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/portal/collect — phone match must be exact', () => {
  it('a short malformed phone does NOT match and corrupt an unrelated existing client', async () => {
    const res = await POST(postReq({ name: 'Attacker Submission', phone: '5' }))
    expect(res.status).toBe(200)
    const unrelated = fake._all('clients').find((c) => c.id === UNRELATED_ID)!
    expect(unrelated.name).toBe('Existing Unrelated Client')
    expect(unrelated.email).toBe('existing@x.com')

    const created = fake._all('clients').find((c) => c.name === 'Attacker Submission')
    expect(created).toBeTruthy()
    expect(created!.id).not.toBe(UNRELATED_ID)
  })

  it('a full exact phone match still correctly updates the same client', async () => {
    const res = await POST(postReq({ name: 'Updated Name', phone: '5551234567', email: 'new@x.com' }))
    expect(res.status).toBe(200)
    const updated = fake._all('clients').find((c) => c.id === UNRELATED_ID)!
    expect(updated.name).toBe('Updated Name')
    expect(updated.email).toBe('new@x.com')
  })
})
