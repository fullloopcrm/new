/**
 * A STOP-reply opt-out only ever writes `clients.sms_consent = false`
 * (webhooks/telnyx/route.ts). This route used to check the sibling
 * `sms_opt_in` column instead — a column nothing in the codebase ever
 * writes false to — so a client who explicitly texted STOP could still be
 * sent an apology-credit SMS by this batch tool. Fixed to check
 * `sms_consent`, matching every other client-SMS-consent-respecting call
 * site (campaigns send, cron/outreach, cron/retention).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

let sentTo: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => {
    sentTo.push(to)
    return { id: 'sms-1' }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function seed() {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme', telnyx_api_key: 'test-key', telnyx_phone: '+15551234567' },
  ])
  fake._seed('clients', [
    { id: 'client-optout', tenant_id: TENANT_ID, name: 'Opted Out', phone: '+15550000001', do_not_service: false, sms_consent: false },
    { id: 'client-optin', tenant_id: TENANT_ID, name: 'Opted In', phone: '+15550000002', do_not_service: false, sms_consent: true },
    { id: 'client-unset', tenant_id: TENANT_ID, name: 'Unset', phone: '+15550000003', do_not_service: false, sms_consent: null },
  ])
}

function sendRequest(clientIds: string[]) {
  return new Request('http://x/api/admin/send-apology-batch', {
    method: 'POST',
    body: JSON.stringify({ client_ids: clientIds, credit_pct: 10, reason: 'test' }),
  }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  seed()
  sentTo = []
})

describe('POST /api/admin/send-apology-batch — sms_consent (not sms_opt_in) gates the send', () => {
  it('skips a client who has sms_consent === false (STOP-reply opt-out)', async () => {
    const res = await POST(sendRequest(['client-optout', 'client-optin', 'client-unset']))
    const body = await res.json()

    expect(body.skipped_opt_out).toBe(1)
    expect(body.sent).toBe(2)
    expect(sentTo).not.toContain('+15550000001')
    expect(sentTo).toContain('+15550000002')
    expect(sentTo).toContain('+15550000003')
  })
})
