import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/admin/comhub/send took `contact_id` straight from the request
 * body and only tenant-verified it when BOTH phone and email were absent —
 * a body carrying contact_id + phone together skipped verification
 * entirely, letting a foreign tenant's comhub_contacts id get stamped onto
 * comhub_messages/comhub_threads for the operating tenant. The DB helper
 * comhub_get_or_create_thread() performs no tenant check of its own, and
 * the thread-detail route embeds comhub_contacts off that FK without
 * re-filtering by tenant_id, so the foreign contact's name/phone/email
 * would render straight into the operating tenant's admin thread view.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null,
}))
vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: async () => TENANT,
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({ data: { id: 'sms-1' } }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const CONTACT_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_CONTACT = '44444444-4444-4444-4444-444444444444'
const THREAD_A = '22222222-2222-2222-2222-222222222222'

function postReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x/api/admin/comhub/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('comhub_contacts', [
    { id: CONTACT_A, tenant_id: TENANT, name: 'Contact A', phone: '5550001111', email: 'a@example.com' },
    { id: FOREIGN_CONTACT, tenant_id: OTHER_TENANT, name: 'Foreign Contact', phone: '5559998888', email: 'b@example.com' },
  ])
  fake._seed('tenants', [{ id: TENANT, name: 'Tenant A', telnyx_api_key: 'k', telnyx_phone: '+15550000000' }])
  fake._seed('comhub_threads', [])
  fake._seed('comhub_messages', [])
})

describe('POST /api/admin/comhub/send — contact_id FK-injection guard', () => {
  it('rejects a contact_id belonging to another tenant even when phone is also supplied, sends no message', async () => {
    const res = await POST(
      postReq({ channel: 'sms', body: 'hi', contact_id: FOREIGN_CONTACT, phone: '5551234567' }),
    )
    expect(res.status).toBe(404)
    expect(fake._all('comhub_messages').length).toBe(0)
    expect(fake._all('comhub_threads').length).toBe(0)
  })

  it('accepts a contact_id genuinely owned by the caller tenant (control)', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_A, tenant_id: TENANT, contact_id: CONTACT_A, channel: 'sms', status: 'open' },
    ])
    const res = await POST(
      postReq({ channel: 'sms', body: 'hi', contact_id: CONTACT_A, thread_id: THREAD_A }),
    )
    expect(res.status).toBe(200)
    expect(fake._all('comhub_messages')[0].contact_id).toBe(CONTACT_A)
  })
})
